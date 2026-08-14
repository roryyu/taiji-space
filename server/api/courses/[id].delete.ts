// DELETE /api/courses/:id 删除课程
// 业务约束：存在未结课（OPEN）排期时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const course = await prisma.course.findUnique({ where: { id }, select: { id: true } })
  if (!course) throw createError({ statusCode: 404, message: '课程不存在' })

  const openSchedules = await prisma.courseSchedule.count({ where: { courseId: id, status: 'OPEN' } })
  if (openSchedules > 0) {
    throw createError({ statusCode: 400, message: '该课程存在开放中的排期，请先取消排期' })
  }

  // 级联清理历史数据：评价 → 预约 → 排期 → 课程
  await prisma.$transaction(async (tx) => {
    await tx.courseReview.deleteMany({ where: { courseId: id } })
    const schedules = await tx.courseSchedule.findMany({ where: { courseId: id }, select: { id: true } })
    const scheduleIds = schedules.map((s) => s.id)
    if (scheduleIds.length > 0) {
      await tx.booking.deleteMany({ where: { scheduleId: { in: scheduleIds } } })
      await tx.courseSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    }
    await tx.course.delete({ where: { id } })
  })

  return { ok: true }
})
