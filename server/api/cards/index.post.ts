// POST /api/cards 开卡
import { z } from 'zod'

const schema = z.object({
  memberId: z.number().int().positive('请选择会员'),
  type: z.enum(['COUNT', 'PERIOD', 'STORED']),
  balance: z.number().min(0, '初始额度不能为负').default(0),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)
  if (data.validTo <= data.validFrom) {
    throw createError({ statusCode: 400, message: '有效期结束时间必须晚于开始时间' })
  }

  const member = await prisma.member.findUnique({ where: { id: data.memberId } })
  if (!member) throw createError({ statusCode: 400, message: '会员不存在' })

  // 卡号规则：TJ + 毫秒时间戳 + 2 位随机数，保证可读且唯一
  const cardNo = `TJ${Date.now()}${Math.floor(Math.random() * 90 + 10)}`

  // 开卡与首笔流水在同一事务中完成
  return prisma.$transaction(async (tx) => {
    const card = await tx.membershipCard.create({
      data: { cardNo, type: data.type, memberId: data.memberId, balance: data.balance, validFrom: data.validFrom, validTo: data.validTo },
    })
    if (data.balance > 0) {
      await tx.cardTransaction.create({
        data: { cardId: card.id, type: 'RECHARGE', amount: data.balance, remark: '开卡充值' },
      })
    }
    return card
  })
})
