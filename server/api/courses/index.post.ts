// POST /api/courses 新增课程
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '课程名称不能为空').max(100),
  storeId: z.number().int().positive('请选择店铺'),
  teacherId: z.number().int().positive('请选择教师'),
  capacity: z.number().int().min(1, '容纳人数至少 1 人').max(500),
  description: z.string().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  // 外键存在性校验，给出友好提示
  const [store, teacher] = await Promise.all([
    prisma.store.findUnique({ where: { id: data.storeId } }),
    prisma.teacher.findUnique({ where: { id: data.teacherId } }),
  ])
  if (!store) throw createError({ statusCode: 400, message: '店铺不存在' })
  if (!teacher) throw createError({ statusCode: 400, message: '教师不存在' })

  return prisma.course.create({ data: { ...data, description: data.description ?? null } })
})
