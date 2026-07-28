// POST /api/members 新增会员
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50),
  category: z.enum(['NORMAL', 'VIP', 'SVIP']),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  storeId: z.number().int().positive('请选择门店'),
  channel: z.enum(['WALK_IN', 'REFERRAL', 'ONLINE', 'ACTIVITY', 'OTHER']),
  coachId: z.number().int().positive().nullable().optional(),
  preferenceTags: z.array(z.string().max(20)).max(10).default([]),
  remark: z.string().max(200).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  // 手机号唯一性预检，给出友好提示（数据库层仍有唯一约束兜底）
  const exists = await prisma.member.findUnique({ where: { phone: data.phone } })
  if (exists) throw createError({ statusCode: 400, message: '该手机号已存在' })

  return prisma.member.create({
    data: { ...data, coachId: data.coachId ?? null, remark: data.remark ?? null },
  })
})
