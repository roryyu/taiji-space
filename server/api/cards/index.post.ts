// POST /api/cards 开卡
// 规则：有效期归一化为业务日（UTC+8）起止；不允许创建已过期卡；卡号碰撞自动重试
import { z } from 'zod'
import { randomInt } from 'node:crypto'

const schema = z.object({
  memberId: z.number().int().positive('请选择会员'),
  storeId: z.number().int().positive('请选择门店'),
  courseId: z.number().int().positive('请选择课程'),
  coachId: z.number().int().positive('请选择教练'),
  totalAmount: z.number().int().min(0, '总金额不能为负').default(0),
  totalSessions: z.number().int().min(0, '总次数不能为负').default(0),
  giftSessions: z.number().int().min(0, '赠送次数不能为负').default(0),
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

  // 外键存在性校验
  const [member, store, course, coach] = await Promise.all([
    prisma.member.findUnique({ where: { id: data.memberId }, select: { id: true } }),
    prisma.store.findUnique({ where: { id: data.storeId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } }),
    prisma.staff.findUnique({ where: { id: data.coachId }, select: { id: true } }),
  ])
  if (!member) throw createError({ statusCode: 400, message: '会员不存在' })
  if (!store) throw createError({ statusCode: 400, message: '门店不存在' })
  if (!course) throw createError({ statusCode: 400, message: '课程不存在' })
  if (!coach) throw createError({ statusCode: 400, message: '教练不存在' })

  // 开卡与首笔流水在同一事务中完成；卡号唯一约束冲突（P2002）时重试
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const card = await tx.membershipCard.create({
          data: {
            cardNo: generateCardNo(),
            memberId: data.memberId,
            storeId: data.storeId,
            courseId: data.courseId,
            coachId: data.coachId,
            totalAmount: data.totalAmount,
            totalSessions: data.totalSessions,
            giftSessions: data.giftSessions,
            validFrom,
            validTo,
          },
        })
        if (data.totalAmount > 0) {
          await tx.cardTransaction.create({
            data: { cardId: card.id, type: 'RECHARGE', amount: data.totalAmount, remark: '开卡充值' },
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
