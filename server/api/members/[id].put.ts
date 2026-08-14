// PUT /api/members/:id 编辑会员
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  channel: z.enum(['WALK_IN', 'REFERRAL', 'ONLINE', 'ACTIVITY', 'OTHER']),
  preferenceTags: z.array(z.string().max(20)).max(10).default([]),
  remark: z.string().max(200).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  const member = await prisma.member.findUnique({ where: { id }, select: { id: true } })
  if (!member) throw createError({ statusCode: 404, message: '会员不存在' })

  // 手机号被其他会员占用时拒绝
  const dup = await prisma.member.findFirst({ where: { phone: data.phone, id: { not: id } } })
  if (dup) throw createError({ statusCode: 400, message: '该手机号已被其他会员使用' })

  return prisma.member.update({
    where: { id },
    data: { ...data, remark: data.remark ?? null },
  })
})
