// DELETE /api/members/:id 删除会员
// 业务约束：存在非过期会员卡或未取消的预约时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const member = await prisma.member.findUnique({ where: { id }, select: { id: true } })
  if (!member) throw createError({ statusCode: 404, message: '会员不存在' })

  const [activeCards, activeBookings] = await Promise.all([
    prisma.membershipCard.count({ where: { memberId: id, status: { in: ['ACTIVE', 'FROZEN'] } } }),
    prisma.booking.count({ where: { memberId: id, status: 'BOOKED' } }),
  ])
  if (activeCards > 0) throw createError({ statusCode: 400, message: '该会员名下存在有效会员卡，无法删除' })
  if (activeBookings > 0) throw createError({ statusCode: 400, message: '该会员存在未完成的预约，无法删除' })

  // 清理历史关联数据后删除（评价/已结束预约/过期卡流水）
  await prisma.$transaction(async (tx) => {
    await tx.courseReview.deleteMany({ where: { memberId: id } })
    await tx.booking.deleteMany({ where: { memberId: id } })
    const cards = await tx.membershipCard.findMany({ where: { memberId: id }, select: { id: true } })
    const cardIds = cards.map((c) => c.id)
    if (cardIds.length > 0) {
      await tx.cardTransaction.deleteMany({ where: { cardId: { in: cardIds } } })
      await tx.membershipCard.deleteMany({ where: { id: { in: cardIds } } })
    }
    await tx.member.delete({ where: { id } })
  })

  return { ok: true }
})
