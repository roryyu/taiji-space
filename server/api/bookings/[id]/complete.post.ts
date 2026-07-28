// POST /api/bookings/:id/complete 完成核销（学员到课）
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) throw createError({ statusCode: 404, message: '预约不存在' })
  if (booking.status !== 'BOOKED') {
    throw createError({ statusCode: 400, message: '仅「已预约」状态可核销完成' })
  }

  return prisma.booking.update({ where: { id }, data: { status: 'COMPLETED' } })
})
