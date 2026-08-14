// DELETE /api/staffs/:id 删除员工
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const staff = await prisma.staff.findUnique({ where: { id }, select: { id: true } })
  if (!staff) throw createError({ statusCode: 404, message: '员工不存在' })

  await prisma.staff.delete({ where: { id } })
  return { ok: true }
})
