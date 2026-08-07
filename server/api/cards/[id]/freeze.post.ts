// POST /api/cards/:id/freeze 冻结会员卡
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  return prisma.$transaction(async (tx) => {
    const card = await tx.membershipCard.findUnique({ where: { id } })
    if (!card) throw createError({ statusCode: 404, message: '会员卡不存在' })
    // 惰性过期兜底：状态为 ACTIVE 但已过有效期的卡先置为过期，禁止冻结
    if (card.status === 'ACTIVE' && card.validTo < new Date()) {
      await tx.membershipCard.update({ where: { id }, data: { status: 'EXPIRED' } })
      throw createError({ statusCode: 400, message: '该会员卡已过期，无法冻结' })
    }
    if (card.status !== 'ACTIVE') throw createError({ statusCode: 400, message: '仅正常状态的会员卡可冻结' })

    const updated = await tx.membershipCard.update({ where: { id }, data: { status: 'FROZEN' } })
    await tx.cardTransaction.create({ data: { cardId: id, type: 'FREEZE', amount: 0, remark: '管理员冻结' } })
    return updated
  })
})
