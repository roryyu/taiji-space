// PUT /api/members/:id 编辑会员
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum(['NORMAL', 'VIP', 'SVIP']),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  storeId: z.number().int().positive(),
  channel: z.enum(['WALK_IN', 'REFERRAL', 'ONLINE', 'ACTIVITY', 'OTHER']),
  coachId: z.number().int().positive().nullable().optional(),
  preferenceTags: z.array(z.string().max(20)).max(10).default([]),
  remark: z.string().max(200).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  // 手机号被其他会员占用时拒绝
  const dup = await prisma.member.findFirst({ where: { phone: data.phone, id: { not: id } } })
  if (dup) throw createError({ statusCode: 400, message: '该手机号已被其他会员使用' })

  return prisma.member.update({
    where: { id },
    data: { ...data, coachId: data.coachId ?? null, remark: data.remark ?? null },
  })
})
