// GET /api/cards 会员卡分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(), // 卡号 / 会员姓名 / 手机号
  storeId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  coachId: z.coerce.number().int().positive().optional(),
  // 运营筛选：RED=运营红灯（耗课未完成且近一个月 0 次上课）
  // RED_NO_FEEDBACK=运营红灯且最近一周无沟通反馈
  opsFilter: z.enum(['RED', 'RED_NO_FEEDBACK']).optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, storeId, courseId, coachId, opsFilter } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  // 获取当前登录员工信息
  const auth = event.context.auth as AuthPayload | undefined

  // 根据角色过滤：
  // MANAGER 只能看自己创建的会员卡
  // ADMINISTRATOR 可以看所有会员卡
  // TEACHER 只能看关联教师是自己的会员卡
  const staffFilter: Prisma.MembershipCardWhereInput = {}
  if (auth?.type === 'MANAGER') {
    staffFilter.staffId = auth.id
  } else if (auth?.type === 'TEACHER') {
    staffFilter.coachId = auth.id
  }
  // ADMINISTRATOR 不过滤（可以看到所有数据）

  const baseWhere: Prisma.MembershipCardWhereInput = {
    ...staffFilter,
    ...(keyword
      ? {
          OR: [
            { cardNo: { contains: keyword } },
            { member: { name: { contains: keyword } } },
            { member: { phone: { contains: keyword } } },
          ],
        }
      : {}),
    ...(storeId ? { storeId } : {}),
    ...(courseId ? { courseId } : {}),
    ...(coachId ? { coachId } : {}),
  }

  // 运营筛选：红灯是派生指标（耗课未完成 + 近 30 天 0 次上课），无法直接在 where 表达，
  // 先在同权限/同筛选范围内查出符合条件的卡 id，再按 id 分页查询
  let where: Prisma.MembershipCardWhereInput = baseWhere
  if (opsFilter) {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const candidates = await prisma.membershipCard.findMany({
      where: {
        ...baseWhere,
        // 近一个月无已上课排期（红灯的必要条件）
        schedules: { none: { status: 'COMPLETED', startTime: { gte: oneMonthAgo } } },
        // 未反馈：会员近一周无任何沟通反馈（含从未沟通）
        ...(opsFilter === 'RED_NO_FEEDBACK'
          ? { member: { feedbacks: { none: { createdAt: { gte: oneWeekAgo } } } } }
          : {}),
      },
      select: {
        id: true,
        totalSessions: true,
        giftSessions: true,
        _count: { select: { schedules: { where: { status: 'COMPLETED' } } } },
      },
    })
    // 耗课未完成的卡才是红灯客户
    const redLightIds = candidates
      .filter((c) => c._count.schedules < c.totalSessions + c.giftSessions)
      .map((c) => c.id)
    where = { ...baseWhere, id: { in: redLightIds } }
  }

  const [total, items] = await Promise.all([
    prisma.membershipCard.count({ where }),
    prisma.membershipCard.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        member: { select: { id: true, name: true, phone: true } },
        store: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        coach: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        // 统计已设置的预约数
        _count: { select: { schedules: true } },
      },
    }),
  ])

  // 批量查询每个会员的最近一次沟通反馈时间（用于列表「最近沟通时间」列）
  const memberIds = [...new Set(items.map((item) => item.memberId))]
  const lastFeedbacks = memberIds.length
    ? await prisma.memberFeedback.groupBy({
        by: ['memberId'],
        where: { memberId: { in: memberIds } },
        _max: { createdAt: true },
      })
    : []
  const lastFeedbackMap = new Map(
    lastFeedbacks
      .filter((f) => f._max.createdAt)
      .map((f) => [f.memberId, f._max.createdAt]),
  )

  // 计算预约情况：已设置预约数 / 总可以预约数（会员卡次数 + 赠送次数）
  // 计算耗课情况：已上课数 / 总课数
  const itemsWithBookingInfo = await Promise.all(items.map(async (item) => {
    // 统计已上课的排期数
    const completedCount = await prisma.courseSchedule.count({
      where: {
        cardId: item.id,
        status: 'COMPLETED',
      },
    })

    // 耗课未完成的卡，统计近30天已上课次数（用于运营标识分级）
    let recentMonthCompleted = 0
    if (completedCount < item.totalSessions + item.giftSessions) {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      recentMonthCompleted = await prisma.courseSchedule.count({
        where: {
          cardId: item.id,
          status: 'COMPLETED',
          startTime: { gte: oneMonthAgo },
        },
      })
    }

    // 最近一次耗课时间：最近一次已上课排期的开始时间
    const lastCompletedSchedule = await prisma.courseSchedule.findFirst({
      where: {
        cardId: item.id,
        status: 'COMPLETED',
      },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    })

    return {
      ...item,
      totalBookable: item.totalSessions + item.giftSessions,
      scheduledCount: item._count.schedules,
      bookingInfo: `${item._count.schedules}/${item.totalSessions + item.giftSessions}`,
      completedCount,
      totalCourseCount: item.totalSessions + item.giftSessions,
      courseUsageInfo: `${completedCount}/${item.totalSessions + item.giftSessions}`,
      recentMonthCompleted,
      lastCompletedTime: lastCompletedSchedule?.startTime ?? null,
      lastFeedbackTime: lastFeedbackMap.get(item.memberId) ?? null,
    }
  }))

  return { items: itemsWithBookingInfo, total, page, pageSize }
})
