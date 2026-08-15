// POST /api/schedules 新增课程排期
// 规则：结束时间必须晚于开始时间；课程、会员卡、会员必须存在
import { z } from 'zod'

const schema = z.object({
  cardId: z.number().int().positive('请选择会员卡'),
  memberId: z.number().int().positive('请选择会员'),
  courseId: z.number().int().positive('请选择课程'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)
  if (data.endTime <= data.startTime) {
    throw createError({ statusCode: 400, message: '结束时间必须晚于开始时间' })
  }

  const [course, card, member] = await Promise.all([
    prisma.course.findUnique({ where: { id: data.courseId } }),
    prisma.membershipCard.findUnique({ where: { id: data.cardId } }),
    prisma.member.findUnique({ where: { id: data.memberId } }),
  ])

  if (!course) throw createError({ statusCode: 400, message: '课程不存在' })
  if (!card) throw createError({ statusCode: 400, message: '会员卡不存在' })
  if (!member) throw createError({ statusCode: 400, message: '会员不存在' })

  return prisma.courseSchedule.create({ data })
})
