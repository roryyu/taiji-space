// GET /api/schedules 课程排期分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  cardId: z.coerce.number().int().positive().optional(),
  memberId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const { courseId, cardId, memberId } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.CourseScheduleWhereInput = {
    ...(courseId ? { courseId } : {}),
    ...(cardId ? { cardId } : {}),
    ...(memberId ? { memberId } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.courseSchedule.count({ where }),
    prisma.courseSchedule.findMany({
      where,
      skip,
      take,
      orderBy: { startTime: 'desc' },
      include: {
        course: {
          select: { id: true, name: true },
        },
        card: {
          select: { id: true, cardNo: true },
        },
        member: {
          select: { id: true, name: true },
        },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
