// POST /api/teachers 新增教师
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50),
  qualification: z.string().min(1, '资质不能为空').max(200),
  styleTags: z.array(z.string().max(20)).max(10).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)
  return prisma.teacher.create({ data })
})
