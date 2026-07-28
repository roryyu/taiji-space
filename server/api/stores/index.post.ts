// POST /api/stores 新建店铺
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, '请输入店铺名称').max(50),
  address: z.string().trim().min(1, '请输入店铺地址').max(200),
  // 经营时段，如 "09:00-21:00"
  businessHours: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, '经营时段格式为 HH:mm-HH:mm'),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  // 店铺名称唯一性校验
  const exists = await prisma.store.findFirst({ where: { name: data.name } })
  if (exists) throw createError({ statusCode: 400, message: '店铺名称已存在' })

  return prisma.store.create({ data })
})
