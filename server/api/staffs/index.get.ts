// GET /api/staffs 员工分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(),
  type: z.enum(['TEACHER', 'COACH', 'MANAGER', 'RECEPTIONIST']).optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, type } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.StaffWhereInput = {
    ...(keyword ? { name: { contains: keyword } } : {}),
    ...(type ? { type } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
    }),
  ])

  return { items, total, page, pageSize }
})
