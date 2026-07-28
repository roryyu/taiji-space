// GET /api/teachers 教师分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, status } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.TeacherWhereInput = {
    ...(keyword ? { name: { contains: keyword } } : {}),
    ...(status ? { status } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { _count: { select: { courses: true, members: true } } },
    }),
  ])

  return { items, total, page, pageSize }
})
