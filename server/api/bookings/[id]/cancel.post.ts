// POST /api/bookings/:id/cancel 取消预约
// 规则：仅 BOOKED 可取消；距开课不足 booking.cancel.deadline.hours 小时禁止取消；条件更新防并发竞态
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { schedule: { select: { startTime: true } } },
  })
  if (!booking) throw createError({ statusCode: 404, message: '预约不存在' })
  if (booking.status !== 'BOOKED') {
    throw createError({ statusCode: 400, message: '仅「已预约」状态可取消' })
  }

  // 取消截止时间校验：开课前 N 小时内禁止取消（系统参数 booking.cancel.deadline.hours）
  const param = await prisma.systemParam.findUnique({ where: { key: 'booking.cancel.deadline.hours' } })
  const deadlineHours = param ? Number.parseFloat(param.value) : Number.NaN
  if (Number.isFinite(deadlineHours) && deadlineHours > 0) {
    const remainMs = booking.schedule.startTime.getTime() - Date.now()
    if (remainMs < deadlineHours * 60 * 60 * 1000) {
      throw createError({ statusCode: 400, message: `距开课不足 ${deadlineHours} 小时，无法取消预约` })
    }
  }

  // 条件更新防并发竞态：仅当仍为 BOOKED 时才置为 CANCELLED
  const { count } = await prisma.booking.updateMany({
    where: { id, status: 'BOOKED' },
    data: { status: 'CANCELLED' },
  })
  if (count === 0) throw createError({ statusCode: 400, message: '预约状态已变更，请刷新后重试' })

  return prisma.booking.findUnique({ where: { id } })
})
