// GET /api/params 系统参数列表
export default defineEventHandler(async () => {
  const items = await prisma.systemParam.findMany({ orderBy: { key: 'asc' } })
  return { items }
})
