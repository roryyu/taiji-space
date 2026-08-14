// POST /api/params 新增或更新系统参数（upsert 语义）
import { z } from 'zod'

const schema = z.object({
  key: z.string().trim().min(1, '请输入参数键').max(50),
  value: z.string().trim().max(500),
  description: z.string().trim().max(200).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  return prisma.systemParam.upsert({
    where: { key: data.key },
    update: { value: data.value, description: data.description ?? null },
    create: { key: data.key, value: data.value, description: data.description ?? null },
  })
})
