// GET /api/stores 店铺列表（分页）
import { z } from 'zod'

const querySchema = z.object({
  keyword: z.string().trim().optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword } = await parseQuery(event, querySchema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where = keyword
    ? { OR: [{ name: { contains: keyword } }, { address: { contains: keyword } }] }
    : {}

  const [total, items] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({
      where,
      // 附带门店下会员/课程数量，供列表展示与删除前提示
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { cards: true } },
      },
      orderBy: { id: 'asc' },
      skip,
      take,
    }),
  ])

  return { items, total, page, pageSize }
})
