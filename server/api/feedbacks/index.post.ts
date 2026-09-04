// POST /api/feedbacks 记录会员沟通反馈（运营红灯客户跟进）
import { z } from 'zod'

const schema = z.object({
  memberId: z.number().int().positive('会员不存在'),
  storeId: z.number().int().positive().default(1),
  courseId: z.number().int().positive().default(1),
  coachId: z.number().int().positive().default(1),
  content: z.string().max(500, '沟通内容最多 500 字').nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)

  const member = await prisma.member.findUnique({ where: { id: data.memberId } })
  if (!member) throw createError({ statusCode: 400, message: '会员不存在' })

  if (!data.content?.trim()) {
    throw createError({ statusCode: 400, message: '请填写沟通内容' })
  }

  return prisma.memberFeedback.create({
    data: {
      memberId: data.memberId,
      storeId: data.storeId,
      courseId: data.courseId,
      coachId: data.coachId,
      content: data.content.trim(),
    },
  })
})
