// PUT /api/schedules/:id 编辑课程排期（阶段/时段/状态）
// 置为 CANCELLED 时级联取消有效预约
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
  })
  if (!schedule) throw createError({ statusCode: 404, message: '排期不存在' })

  return prisma.$transaction(async (tx) => {
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
