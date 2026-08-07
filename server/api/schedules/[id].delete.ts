// DELETE /api/schedules/:id 删除课程排期
// 业务约束：存在有效预约（BOOKED）或已完成记录（COMPLETED，用于上课频次统计）时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const schedule = await prisma.courseSchedule.findUnique({ where: { id }, select: { id: true } })
  if (!schedule) throw createError({ statusCode: 404, message: '排期不存在' })

  const blockingBookings = await prisma.booking.count({
    where: { scheduleId: id, status: { in: ['BOOKED', 'COMPLETED'] } },
  })
  if (blockingBookings > 0) {
    throw createError({ statusCode: 400, message: '该排期存在有效或已完成的预约记录，无法删除' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.deleteMany({ where: { scheduleId: id } })
    await tx.courseSchedule.delete({ where: { id } })
  })

  return { ok: true }
})
