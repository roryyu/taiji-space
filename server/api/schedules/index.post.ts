// POST /api/schedules 新增课程排期
// 规则：结束时间必须晚于开始时间；课程必须存在
import { z } from 'zod'

const schema = z.object({
  courseId: z.number().int().positive('请选择课程'),
  stage: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)
  if (data.endTime <= data.startTime) {
    throw createError({ statusCode: 400, message: '结束时间必须晚于开始时间' })
  }

  const course = await prisma.course.findUnique({ where: { id: data.courseId } })
  if (!course) throw createError({ statusCode: 400, message: '课程不存在' })

  return prisma.courseSchedule.create({ data })
})
