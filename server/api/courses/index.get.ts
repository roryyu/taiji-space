// GET /api/courses 课程分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(),
  storeId: z.coerce.number().int().positive().optional(),
  teacherId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, storeId, teacherId } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.CourseWhereInput = {
    ...(keyword ? { name: { contains: keyword } } : {}),
    ...(storeId ? { storeId } : {}),
    ...(teacherId ? { teacherId } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { schedules: true } },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
