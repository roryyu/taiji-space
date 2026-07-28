// PUT /api/courses/:id 编辑课程
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  storeId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
  capacity: z.number().int().min(1).max(500),
  description: z.string().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  const course = await prisma.course.findUnique({ where: { id } })
  if (!course) throw createError({ statusCode: 404, message: '课程不存在' })

  return prisma.course.update({
    where: { id },
    data: { ...data, description: data.description ?? null },
  })
})
