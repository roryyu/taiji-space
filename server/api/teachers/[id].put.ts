// PUT /api/teachers/:id 编辑教师
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(50),
  qualification: z.string().min(1).max(200),
  styleTags: z.array(z.string().max(20)).max(10).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  const teacher = await prisma.teacher.findUnique({ where: { id } })
  if (!teacher) throw createError({ statusCode: 404, message: '教师不存在' })

  return prisma.teacher.update({ where: { id }, data })
})
