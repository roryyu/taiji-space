// GET /api/cards 会员卡分页查询
// 查询时对已超过有效期但状态仍为 ACTIVE 的卡即时标记为 EXPIRED（惰性过期）
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(), // 卡号 / 会员姓名 / 手机号
  type: z.enum(['COUNT', 'PERIOD', 'STORED']).optional(),
  status: z.enum(['ACTIVE', 'FROZEN', 'EXPIRED']).optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, type, status } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  // 惰性过期：将超期的正常卡批量置为过期，保证列表状态准确
  await prisma.membershipCard.updateMany({
    where: { status: 'ACTIVE', validTo: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  })

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
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.membershipCard.count({ where }),
    prisma.membershipCard.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { member: { select: { id: true, name: true, phone: true } } },
    }),
  ])

  return { items, total, page, pageSize }
})
