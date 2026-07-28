// DELETE /api/reviews/:id 删除课程评价
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const review = await prisma.courseReview.findUnique({ where: { id } })
  if (!review) throw createError({ statusCode: 404, message: '评价不存在' })

  await prisma.courseReview.delete({ where: { id } })
  return { ok: true }
})
