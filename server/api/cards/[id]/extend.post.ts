// POST /api/cards/:id/extend 有效期管理（延长有效期）
import { z } from 'zod'

const schema = z.object({
  validTo: z.coerce.date(),
  remark: z.string().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const { validTo: rawValidTo, remark } = await parseBody(event, schema)
  // 归一化到业务日（UTC+8）结束时刻，与开卡口径保持一致
  const validTo = endOfDayCST(rawValidTo)

  return prisma.$transaction(async (tx) => {
    const card = await tx.membershipCard.findUnique({ where: { id } })
    if (!card) throw createError({ statusCode: 404, message: '会员卡不存在' })
    if (validTo <= card.validTo) {
      throw createError({ statusCode: 400, message: '新有效期必须晚于当前有效期' })
    }

    const updated = await tx.membershipCard.update({
      where: { id },
      data: { validTo },
    })
    await tx.cardTransaction.create({
      data: { cardId: id, type: 'EXTEND', amount: 0, remark: remark ?? `有效期延长至 ${validTo.toISOString().slice(0, 10)}` },
    })
    return updated
  })
})
