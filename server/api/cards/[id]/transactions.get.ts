// GET /api/cards/:id/transactions 会员卡流水（最近 100 条）
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const card = await prisma.membershipCard.findUnique({ where: { id }, select: { id: true } })
  if (!card) throw createError({ statusCode: 404, message: '会员卡不存在' })

  return prisma.cardTransaction.findMany({
    where: { cardId: id },
    orderBy: { id: 'desc' },
    take: 100,
  })
})
