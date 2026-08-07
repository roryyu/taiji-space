// POST /api/cards 开卡
// 规则：有效期归一化为业务日（UTC+8）起止；不允许创建已过期卡；卡号碰撞自动重试
import { z } from 'zod'
import { randomInt } from 'node:crypto'

const schema = z.object({
  memberId: z.number().int().positive('请选择会员'),
  type: z.enum(['COUNT', 'PERIOD', 'STORED']),
  balance: z.number().min(0, '初始额度不能为负').default(0),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
})

/** 卡号规则：TJ + 毫秒时间戳 + 6 位加密随机数，碰撞由唯一约束兜底并重试 */
function generateCardNo(): string {
  return `TJ${Date.now()}${String(randomInt(0, 1_000_000)).padStart(6, '0')}`
}

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  // 归一化为业务日起止，避免 "YYYY-MM-DD" 按 UTC 零点解析造成 UTC+8 下提前过期
  const validFrom = startOfDayCST(data.validFrom)
  const validTo = endOfDayCST(data.validTo)
  if (validTo <= validFrom) {
    throw createError({ statusCode: 400, message: '有效期结束时间必须晚于开始时间' })
  }
  if (validTo < new Date()) {
    throw createError({ statusCode: 400, message: '有效期截止日期不能早于今天' })
  }

  const member = await prisma.member.findUnique({ where: { id: data.memberId } })
  if (!member) throw createError({ statusCode: 400, message: '会员不存在' })

  // 开卡与首笔流水在同一事务中完成；卡号唯一约束冲突（P2002）时重试
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const card = await tx.membershipCard.create({
          data: { cardNo: generateCardNo(), type: data.type, memberId: data.memberId, balance: data.balance, validFrom, validTo },
        })
        if (data.balance > 0) {
          await tx.cardTransaction.create({
            data: { cardId: card.id, type: 'RECHARGE', amount: data.balance, remark: '开卡充值' },
          })
        }
        return card
      })
    }
    catch (err) {
      lastError = err
      if ((err as { code?: string } | null)?.code !== 'P2002') throw err
    }
  }
  throw lastError
})
