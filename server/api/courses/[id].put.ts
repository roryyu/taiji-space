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

  // 外键存在性校验（与课程创建保持一致）
  const [store, teacher] = await Promise.all([
    prisma.store.findUnique({ where: { id: data.storeId }, select: { id: true } }),
    prisma.teacher.findUnique({ where: { id: data.teacherId }, select: { id: true } }),
  ])
  if (!store) throw createError({ statusCode: 400, message: '门店不存在' })
  if (!teacher) throw createError({ statusCode: 400, message: '教师不存在' })

  // 容量不允许低于现有有效预约数，防止破坏「预约数 ≤ 容量」不变量
  if (data.capacity < course.capacity) {
    const occupied = await prisma.booking.count({
      where: { status: { not: 'CANCELLED' }, schedule: { courseId: id } },
    })
    if (data.capacity < occupied) {
      throw createError({ statusCode: 400, message: `容量不能低于当前有效预约数（${occupied}）` })
    }
  }

  return prisma.course.update({
    where: { id },
    data: { ...data, description: data.description ?? null },
  })
})
