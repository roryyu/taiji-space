// DELETE /api/schedules/:id 删除课程排期
// 规则：已上课的排期不能删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const schedule = await prisma.courseSchedule.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!schedule) throw createError({ statusCode: 404, message: '排期不存在' })

  // 检查是否为已上课的排期
  if (schedule.status === 'COMPLETED') {
    throw createError({ statusCode: 400, message: '已上课的排期不能删除' })
  }

  await prisma.courseSchedule.delete({ where: { id } })

  return { ok: true }
})
