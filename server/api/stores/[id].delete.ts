// DELETE /api/stores/:id 删除店铺
// 业务约束：店铺下存在会员或课程时禁止删除
export default defineEventHandler(async (event) => {
  const id = parseId(event)

  const store = await prisma.store.findUnique({
    where: { id },
    include: { _count: { select: { cards: true } } },
  })
  if (!store) throw createError({ statusCode: 404, message: '店铺不存在' })
  if (store._count.cards > 0)
    throw createError({ statusCode: 400, message: '该店铺下存在会员卡，无法删除' })

  await prisma.store.delete({ where: { id } })
  return { ok: true }
})
