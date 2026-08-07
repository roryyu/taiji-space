// POST /api/reviews 录入课程评价
import { z } from 'zod'

const schema = z.object({
  memberId: z.number().int().positive('请选择会员'),
  courseId: z.number().int().positive('请选择课程'),
  rating: z.number().int().min(1, '评分 1-5 星').max(5, '评分 1-5 星'),
  suggestion: z.string().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  const [member, course] = await Promise.all([
    prisma.member.findUnique({ where: { id: data.memberId } }),
    prisma.course.findUnique({ where: { id: data.courseId } }),
  ])
  if (!member) throw createError({ statusCode: 400, message: '会员不存在' })
  if (!course) throw createError({ statusCode: 400, message: '课程不存在' })

  try {
    return await prisma.courseReview.create({
      data: { ...data, suggestion: data.suggestion ?? null },
    })
  } catch (err) {
    // 唯一约束（memberId + courseId）冲突：同一会员对同一课程仅可评价一次
    if ((err as { code?: string } | null)?.code === 'P2002') {
      throw createError({ statusCode: 400, message: '该会员已评价过此课程' })
    }
    throw err
  }
})
