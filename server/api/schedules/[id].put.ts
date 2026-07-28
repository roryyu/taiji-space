// PUT /api/schedules/:id 编辑课程排期（阶段/时段/状态）
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

  // 教师时间冲突校验（排除自身）
  const conflict = await prisma.courseSchedule.findFirst({
    where: {
      id: { not: id },
      course: { teacherId: schedule.course.teacherId },
      status: { not: 'CANCELLED' },
      startTime: { lt: data.endTime },
      endTime: { gt: data.startTime },
    },
  })
  if (conflict && data.status !== 'CANCELLED') {
    throw createError({ statusCode: 400, message: '该教师此时段已有其他排期，请调整时间' })
  }

  return prisma.courseSchedule.update({ where: { id }, data })
})
