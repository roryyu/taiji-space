// DELETE /api/teachers/:id 删除教师
// 业务约束：名下存在课程或专属会员时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const [courses, members] = await Promise.all([
    prisma.course.count({ where: { teacherId: id } }),
    prisma.member.count({ where: { coachId: id } }),
  ])
  if (courses > 0) throw createError({ statusCode: 400, message: '该教师名下存在课程，无法删除' })
  if (members > 0) throw createError({ statusCode: 400, message: '该教师是部分会员的专属教练，无法删除' })

  await prisma.teacher.delete({ where: { id } })
  return { ok: true }
})
