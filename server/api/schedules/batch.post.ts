// POST /api/schedules/batch 批量更新课程排期
// 规则：未上课的排期可以根据id更新，已上课的排期不能更新
import { z } from 'zod'

const scheduleItemSchema = z.object({
  id: z.number().int().positive().optional(), // 已有排期的id，新增时为空
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
})

const schema = z.object({
  cardId: z.number().int().positive(),
  memberId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  schedules: z.array(scheduleItemSchema),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { cardId, memberId, courseId, schedules } = schema.parse(body)

  // 验证会员卡是否存在
  const card = await prisma.membershipCard.findUnique({
    where: { id: cardId },
    select: { id: true, totalSessions: true, giftSessions: true, memberId: true, courseId: true },
  })

  if (!card) {
    throw createError({ statusCode: 404, message: '会员卡不存在' })
  }

  // 验证会员卡是否属于该会员
  if (card.memberId !== memberId) {
    throw createError({ statusCode: 400, message: '会员卡不属于该会员' })
  }

  // 验证会员卡是否关联该课程
  if (card.courseId !== courseId) {
    throw createError({ statusCode: 400, message: '会员卡未关联该课程' })
  }

  // 计算总可预约次数
  const totalBookable = card.totalSessions + card.giftSessions

  // 验证排期数量是否超过可预约次数
  if (schedules.length > totalBookable) {
    throw createError({
      statusCode: 400,
      message: `排期数量超过可预约次数。最多可设置${totalBookable}次`,
    })
  }

  // 验证每个排期的开始时间是否早于结束时间
  for (const schedule of schedules) {
    if (schedule.startTime >= schedule.endTime) {
      throw createError({ statusCode: 400, message: '排期开始时间必须早于结束时间' })
    }
  }

  // 分离新增和更新的排期
  const newSchedules = schedules.filter((s) => !s.id)
  const updateSchedules = schedules.filter((s) => s.id)

  // 验证要更新的排期是否存在且状态为未上课
  if (updateSchedules.length > 0) {
    const existingSchedules = await prisma.courseSchedule.findMany({
      where: {
        id: { in: updateSchedules.map((s) => s.id!) },
        cardId,
      },
      select: { id: true, status: true },
    })

    // 检查是否有已上课的排期被尝试更新
    const completedSchedules = existingSchedules.filter((s) => s.status === 'COMPLETED')
    if (completedSchedules.length > 0) {
      throw createError({
        statusCode: 400,
        message: `已上课的排期不能修改（ID: ${completedSchedules.map((s) => s.id).join(', ')}）`,
      })
    }

    // 检查要更新的排期是否都存在
    const existingIds = new Set(existingSchedules.map((s) => s.id))
    const missingIds = updateSchedules.filter((s) => !existingIds.has(s.id!))
    if (missingIds.length > 0) {
      throw createError({
        statusCode: 400,
        message: `排期不存在（ID: ${missingIds.map((s) => s.id).join(', ')}）`,
      })
    }
  }

  // 使用事务处理
  const result = await prisma.$transaction(async (tx) => {
    // 删除该会员卡中未上课的排期（已上课的保留）
    await tx.courseSchedule.deleteMany({
      where: {
        cardId,
        status: 'PENDING',
      },
    })

    // 创建所有新的排期
    let createdCount = 0
    if (schedules.length > 0) {
      const created = await tx.courseSchedule.createMany({
        data: schedules.map((schedule) => ({
          cardId,
          memberId,
          courseId,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: 'PENDING',
        })),
      })
      createdCount = created.count
    }

    return { createdCount }
  })

  return { success: true, count: result.createdCount }
})
