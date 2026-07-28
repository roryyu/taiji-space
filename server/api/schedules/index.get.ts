// GET /api/schedules 课程排期分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  stage: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).optional(),
  status: z.enum(['OPEN', 'FINISHED', 'CANCELLED']).optional(),
})

export default defineEventHandler(async (event) => {
  const { courseId, stage, status } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.CourseScheduleWhereInput = {
    ...(courseId ? { courseId } : {}),
    ...(stage ? { stage } : {}),
    ...(status ? { status } : {}),
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
          select: { id: true, name: true, capacity: true, teacher: { select: { id: true, name: true } } },
        },
        // 仅统计有效预约数，用于展示「已约/容量」
        _count: { select: { bookings: { where: { status: { not: 'CANCELLED' } } } } },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
