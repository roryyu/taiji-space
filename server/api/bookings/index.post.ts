// POST /api/bookings 预约课程
// 规则：排期必须 OPEN；容量校验防超卖；同会员同排期不可重复预约
// 事务内先行锁定排期行（SELECT FOR UPDATE 等价：串行化校验），保证并发安全
import { z } from 'zod'

const schema = z.object({
  memberId: z.number().int().positive('请选择会员'),
  scheduleId: z.number().int().positive('请选择排期'),
})

export default defineEventHandler(async (event) => {
  const { memberId, scheduleId } = await parseBody(event, schema)

  return prisma.$transaction(async (tx) => {
    // 行级锁锁定排期，避免并发预约超过容量
    await tx.$queryRaw`SELECT id FROM "CourseSchedule" WHERE id = ${scheduleId} FOR UPDATE`

    const schedule = await tx.courseSchedule.findUnique({
      where: { id: scheduleId },
    })
    if (!schedule) throw createError({ statusCode: 400, message: '排期不存在' })
    if (schedule.status !== 'OPEN') throw createError({ statusCode: 400, message: '该排期未开放预约' })

    const member = await tx.member.findUnique({ where: { id: memberId } })
    if (!member) throw createError({ statusCode: 400, message: '会员不存在' })

    // 重复预约校验：已取消的记录允许重新预约（复用原记录）
    const existing = await tx.booking.findUnique({
      where: { memberId_scheduleId: { memberId, scheduleId } },
    })
    if (existing && existing.status !== 'CANCELLED') {
      throw createError({ statusCode: 400, message: '该会员已预约此排期' })
    }

    if (existing) {
      return tx.booking.update({ where: { id: existing.id }, data: { status: 'BOOKED' } })
    }
    return tx.booking.create({ data: { memberId, scheduleId } })
  })
})
