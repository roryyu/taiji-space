// PUT /api/schedules/:id 编辑课程排期（阶段/时段/状态）
// 事务内锁定教师行串行化冲突校验（防 TOCTOU）；置为 CANCELLED 时级联取消有效预约
import { z } from 'zod'

const schema = z.object({
  stage: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  status: z.enum(['OPEN', 'FINISHED', 'CANCELLED']),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)
  if (data.endTime <= data.startTime) {
    throw createError({ statusCode: 400, message: '结束时间必须晚于开始时间' })
  }

  const schedule = await prisma.courseSchedule.findUnique({
    where: { id },
    include: { course: { select: { teacherId: true } } },
  })
  if (!schedule) throw createError({ statusCode: 404, message: '排期不存在' })

  return prisma.$transaction(async (tx) => {
    // 锁定教师行，保证冲突校验与更新原子串行
    await tx.$queryRaw`SELECT id FROM "Teacher" WHERE id = ${schedule.course.teacherId} FOR UPDATE`

    // 教师时间冲突校验（排除自身）
    if (data.status !== 'CANCELLED') {
      const conflict = await tx.courseSchedule.findFirst({
        where: {
          id: { not: id },
          course: { teacherId: schedule.course.teacherId },
          status: { not: 'CANCELLED' },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
      })
      if (conflict) {
        throw createError({ statusCode: 400, message: '该教师此时段已有其他排期，请调整时间' })
      }
    }

    // 取消排期时级联取消其有效预约，避免产生孤儿 BOOKED 记录
    if (data.status === 'CANCELLED') {
      await tx.booking.updateMany({
        where: { scheduleId: id, status: 'BOOKED' },
        data: { status: 'CANCELLED' },
      })
    }

    return tx.courseSchedule.update({ where: { id }, data })
  })
})
