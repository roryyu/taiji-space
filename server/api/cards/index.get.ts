// GET /api/cards 会员卡分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(), // 卡号 / 会员姓名 / 手机号
  storeId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  coachId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, storeId, courseId, coachId } = parseQuery(event, schema)
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

  const where: Prisma.MembershipCardWhereInput = {
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

    return {
      ...item,
      totalBookable: item.totalSessions + item.giftSessions,
      scheduledCount: item._count.schedules,
      bookingInfo: `${item._count.schedules}/${item.totalSessions + item.giftSessions}`,
      completedCount,
      totalCourseCount: item.totalSessions + item.giftSessions,
      courseUsageInfo: `${completedCount}/${item.totalSessions + item.giftSessions}`,
    }
  }))

  return { items: itemsWithBookingInfo, total, page, pageSize }
})
