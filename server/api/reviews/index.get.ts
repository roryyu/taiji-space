// GET /api/reviews 课程评价分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  memberId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
})

export default defineEventHandler(async (event) => {
  const { courseId, memberId, rating } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.CourseReviewWhereInput = {
    ...(courseId ? { courseId } : {}),
    ...(memberId ? { memberId } : {}),
    ...(rating ? { rating } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.courseReview.count({ where }),
    prisma.courseReview.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        member: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
