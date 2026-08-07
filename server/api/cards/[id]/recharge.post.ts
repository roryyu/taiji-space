// POST /api/cards/:id/recharge 充值
// 规则：仅 ACTIVE 状态可充值；余额更新与流水写入在同一事务
import { z } from 'zod'

const schema = z.object({
  amount: z.number().positive('充值金额必须大于 0'),
  remark: z.string().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const { amount, remark } = await parseBody(event, schema)

  return prisma.$transaction(async (tx) => {
    const card = await tx.membershipCard.findUnique({ where: { id } })
    if (!card) throw createError({ statusCode: 404, message: '会员卡不存在' })
    // 惰性过期兜底：状态为 ACTIVE 但已过有效期的卡先置为过期，禁止充值
    if (card.status === 'ACTIVE' && card.validTo < new Date()) {
      await tx.membershipCard.update({ where: { id }, data: { status: 'EXPIRED' } })
      throw createError({ statusCode: 400, message: '该会员卡已过期，无法充值' })
    }
    if (card.status !== 'ACTIVE') throw createError({ statusCode: 400, message: '仅正常状态的会员卡可充值' })

    const updated = await tx.membershipCard.update({
      where: { id },
      data: { balance: { increment: amount } },
    })
    await tx.cardTransaction.create({
      data: { cardId: id, type: 'RECHARGE', amount, remark: remark ?? '人工充值' },
    })
    return updated
  })
})
