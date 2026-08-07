// POST /api/bookings/:id/complete 完成核销（学员到课）
// 规则：仅 BOOKED 可核销；条件更新防并发竞态
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) throw createError({ statusCode: 404, message: '预约不存在' })
  if (booking.status !== 'BOOKED') {
    throw createError({ statusCode: 400, message: '仅「已预约」状态可核销完成' })
  }

  // 条件更新防并发竞态：仅当仍为 BOOKED 时才置为 COMPLETED
  const { count } = await prisma.booking.updateMany({
    where: { id, status: 'BOOKED' },
    data: { status: 'COMPLETED' },
  })
  if (count === 0) throw createError({ statusCode: 400, message: '预约状态已变更，请刷新后重试' })

  return prisma.booking.findUnique({ where: { id } })
})
