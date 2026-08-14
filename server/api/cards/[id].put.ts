// PUT /api/cards/:id 编辑会员卡
import { z } from 'zod'

const schema = z.object({
  storeId: z.number().int().positive('请选择门店'),
  courseId: z.number().int().positive('请选择课程'),
  coachId: z.number().int().positive('请选择教练'),
  totalAmount: z.number().int().min(0, '总金额不能为负'),
  totalSessions: z.number().int().min(0, '总次数不能为负'),
  giftSessions: z.number().int().min(0, '赠送次数不能为负'),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  const card = await prisma.membershipCard.findUnique({ where: { id }, select: { id: true } })
  if (!card) throw createError({ statusCode: 404, message: '会员卡不存在' })

  // 归一化为业务日起止
  const validFrom = startOfDayCST(data.validFrom)
  const validTo = endOfDayCST(data.validTo)
  if (validTo <= validFrom) {
    throw createError({ statusCode: 400, message: '有效期结束时间必须晚于开始时间' })
  }

  // 外键存在性校验
  const [store, course, coach] = await Promise.all([
    prisma.store.findUnique({ where: { id: data.storeId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } }),
    prisma.staff.findUnique({ where: { id: data.coachId }, select: { id: true } }),
  ])
  if (!store) throw createError({ statusCode: 400, message: '门店不存在' })
  if (!course) throw createError({ statusCode: 400, message: '课程不存在' })
  if (!coach) throw createError({ statusCode: 400, message: '教练不存在' })

  return prisma.membershipCard.update({
    where: { id },
    data: {
      storeId: data.storeId,
      courseId: data.courseId,
      coachId: data.coachId,
      totalAmount: data.totalAmount,
      totalSessions: data.totalSessions,
      giftSessions: data.giftSessions,
      validFrom,
      validTo,
    },
  })
})
