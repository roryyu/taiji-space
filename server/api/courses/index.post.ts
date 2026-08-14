// POST /api/courses 新增课程
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '课程名称不能为空').max(100),
  description: z.string().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  return prisma.course.create({ data: { ...data, description: data.description ?? null } })
})
