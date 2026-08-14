// PUT /api/stores/:id 编辑店铺
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, '请输入店铺名称').max(50),
  address: z.string().trim().min(1, '请输入店铺地址').max(200),
  // 经营时段，如 "09:00-21:00"（严格校验小时 00-23、分钟 00-59）
  businessHours: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/, '经营时段格式为 HH:mm-HH:mm（如 09:00-21:00）'),
  staffId: z.coerce.number().int().positive().nullable().optional(), // 店长（MANAGER 类型员工，null 表示清除）
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  const store = await prisma.store.findUnique({ where: { id } })
  if (!store) throw createError({ statusCode: 404, message: '店铺不存在' })

  // 名称不可与其他店铺重复
  const dup = await prisma.store.findFirst({ where: { name: data.name, id: { not: id } } })
  if (dup) throw createError({ statusCode: 400, message: '店铺名称已存在' })

  return prisma.store.update({ where: { id }, data })
})
