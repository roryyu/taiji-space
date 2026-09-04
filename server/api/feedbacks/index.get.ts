// GET /api/feedbacks 会员沟通反馈查询（按会员查看历史，服务端分页）
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  memberId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const { memberId } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.MemberFeedbackWhereInput = {
    ...(memberId ? { memberId } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.memberFeedback.count({ where }),
    prisma.memberFeedback.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        member: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        coach: { select: { id: true, name: true } },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
