// PUT /api/schedules/:id 编辑课程排期
// 支持更新时段和状态
import { z } from 'zod'

const schema = z.object({
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  // 如果同时传了 startTime 和 endTime，校验时间顺序
  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    throw createError({ statusCode: 400, message: '结束时间必须晚于开始时间' })
  }

  const schedule = await prisma.courseSchedule.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!schedule) throw createError({ statusCode: 404, message: '排期不存在' })

  // 如果要更新时段，检查是否为已上课的排期
  if ((data.startTime || data.endTime) && schedule.status === 'COMPLETED') {
    throw createError({ statusCode: 400, message: '已上课的排期不能修改时段' })
  }

  // 如果要更新状态为已完成，直接更新
  if (data.status === 'COMPLETED') {
    return prisma.courseSchedule.update({
      where: { id },
      data: { status: 'COMPLETED' },
    })
  }

  // 其他更新
  return prisma.courseSchedule.update({ where: { id }, data })
})
