// GET /api/members 会员分页查询
// 筛选：keyword（姓名/手机号）、channel
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  keyword: z.string().optional(),
  channel: z.enum(['WALK_IN', 'REFERRAL', 'ONLINE', 'ACTIVITY', 'OTHER']).optional(),
})

export default defineEventHandler(async (event) => {
  const { keyword, channel } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.MemberWhereInput = {
    ...(keyword
      ? { OR: [{ name: { contains: keyword } }, { phone: { contains: keyword } }] }
      : {}),
    ...(channel ? { channel } : {}),
  }

  // count 与列表查询并行执行，减少一次数据库往返等待
  const [total, items] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
    }),
  ])

  return { items, total, page, pageSize }
})
