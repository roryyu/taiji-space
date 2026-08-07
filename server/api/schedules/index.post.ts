// POST /api/schedules 新增课程排期
// 规则：结束时间必须晚于开始时间；同教师时间段不可重叠
// 事务内锁定教师行，串行化同教师排期的冲突校验与写入，避免并发下的 TOCTOU 绕过
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

  return prisma.$transaction(async (tx) => {
    // 锁定教师行，保证同教师排期的冲突校验与写入原子串行
    await tx.$queryRaw`SELECT id FROM "Teacher" WHERE id = ${course.teacherId} FOR UPDATE`

    // 教师时间冲突校验：同教师名下所有课程的未取消排期不可与新时段重叠
    const conflict = await tx.courseSchedule.findFirst({
      where: {
        course: { teacherId: course.teacherId },
        status: { not: 'CANCELLED' },
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
      },
      include: { course: { select: { name: true } } },
    })
    if (conflict) {
      throw createError({ statusCode: 400, message: `该教师此时段已有排期（${conflict.course.name}），请调整时间` })
    }

    return tx.courseSchedule.create({ data })
  })
})
