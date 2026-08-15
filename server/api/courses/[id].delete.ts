// DELETE /api/courses/:id 删除课程
// 业务约束：存在排期时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const course = await prisma.course.findUnique({ where: { id }, select: { id: true } })
  if (!course) throw createError({ statusCode: 404, message: '课程不存在' })

  const scheduleCount = await prisma.courseSchedule.count({ where: { courseId: id } })
  if (scheduleCount > 0) {
    throw createError({ statusCode: 400, message: '该课程存在排期，请先删除排期' })
  }

  // 级联清理历史数据：评价 → 课程
  await prisma.$transaction(async (tx) => {
    await tx.courseReview.deleteMany({ where: { courseId: id } })
    await tx.course.delete({ where: { id } })
  })

  return { ok: true }
})
