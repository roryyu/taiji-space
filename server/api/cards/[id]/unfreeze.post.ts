// POST /api/cards/:id/unfreeze 解冻会员卡
// 规则：仅 FROZEN 状态可解冻；若已超过有效期则直接置为过期
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  return prisma.$transaction(async (tx) => {
    const card = await tx.membershipCard.findUnique({ where: { id } })
    if (!card) throw createError({ statusCode: 404, message: '会员卡不存在' })
    if (card.status !== 'FROZEN') throw createError({ statusCode: 400, message: '仅冻结状态的会员卡可解冻' })

    // 冻结期间超期的卡，解冻后应为过期而非正常
    const nextStatus = card.validTo < new Date() ? 'EXPIRED' : 'ACTIVE'
    const updated = await tx.membershipCard.update({ where: { id }, data: { status: nextStatus } })
    await tx.cardTransaction.create({ data: { cardId: id, type: 'UNFREEZE', amount: 0, remark: '管理员解冻' } })
    return updated
  })
})
