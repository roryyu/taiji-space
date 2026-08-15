// GET /api/schedules/calendar 获取日历视图数据
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const { startDate, endDate, staffId } = parseQuery(event, schema)

  const where = {
    startTime: {
      gte: new Date(startDate + 'T00:00:00'),
      lte: new Date(endDate + 'T23:59:59'),
    },
    ...(staffId ? { card: { coachId: staffId } } : {}),
  }

  const items = await prisma.courseSchedule.findMany({
    where,
    orderBy: { startTime: 'asc' },
    include: {
      course: {
        select: { id: true, name: true },
      },
      card: {
        select: { id: true, cardNo: true, coachId: true },
      },
      member: {
        select: { id: true, name: true },
      },
    },
  })

  return { items }
})
