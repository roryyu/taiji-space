// DELETE /api/params/:key 删除系统参数
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key) throw createError({ statusCode: 400, message: '缺少参数键' })

  const param = await prisma.systemParam.findUnique({ where: { key } })
  if (!param) throw createError({ statusCode: 404, message: '参数不存在' })

  await prisma.systemParam.delete({ where: { key } })
  return { ok: true }
})
