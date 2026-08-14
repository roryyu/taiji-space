// GET /api/courses 课程分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.CourseWhereInput = {
    ...(keyword ? { name: { contains: keyword } } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
    }),
  ])

  return { items, total, page, pageSize }
})
