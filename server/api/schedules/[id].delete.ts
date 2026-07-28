// DELETE /api/schedules/:id 删除课程排期
// 业务约束：存在有效预约（BOOKED）时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const activeBookings = await prisma.booking.count({ where: { scheduleId: id, status: 'BOOKED' } })
  if (activeBookings > 0) {
    throw createError({ statusCode: 400, message: '该排期存在有效预约，请先处理预约记录' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.deleteMany({ where: { scheduleId: id } })
    await tx.courseSchedule.delete({ where: { id } })
  })

  return { ok: true }
})
