// GET /api/cards 会员卡分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(), // 卡号 / 会员姓名 / 手机号
  storeId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  coachId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, storeId, courseId, coachId } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.MembershipCardWhereInput = {
    ...(keyword
      ? {
          OR: [
            { cardNo: { contains: keyword } },
            { member: { name: { contains: keyword } } },
            { member: { phone: { contains: keyword } } },
          ],
        }
      : {}),
    ...(storeId ? { storeId } : {}),
    ...(courseId ? { courseId } : {}),
    ...(coachId ? { coachId } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.membershipCard.count({ where }),
    prisma.membershipCard.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        member: { select: { id: true, name: true, phone: true } },
        store: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        coach: { select: { id: true, name: true } },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
