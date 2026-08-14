// GET /api/bookings 课程预约分页查询
import { z } from 'zod'
import type { Prisma } from '~~/generated/prisma/client'

const schema = z.object({
  memberId: z.coerce.number().int().positive().optional(),
  scheduleId: z.coerce.number().int().positive().optional(),
  status: z.enum(['BOOKED', 'CANCELLED', 'COMPLETED']).optional(),
})

export default defineEventHandler(async (event) => {
  const { memberId, scheduleId, status } = parseQuery(event, schema)
  const { page, pageSize, skip, take } = parsePagination(event)

  const where: Prisma.BookingWhereInput = {
    ...(memberId ? { memberId } : {}),
    ...(scheduleId ? { scheduleId } : {}),
    ...(status ? { status } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        member: { select: { id: true, name: true, phone: true } },
        // 排期信息带出课程阶段与课程时间
        schedule: { select: { id: true, stage: true, startTime: true, endTime: true, course: { select: { id: true, name: true } } } },
      },
    }),
  ])

  return { items, total, page, pageSize }
})
