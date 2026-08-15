// GET /api/analytics/members 会员分析
// 课程偏好标签频次分布
export default defineEventHandler(async () => {
  // 偏好标签分布：标签是字符串数组，需在应用层展开计数（会员量级可控）
  const allMembers = await prisma.member.findMany({ select: { preferenceTags: true } })
  const tagCount = new Map<string, number>()
  for (const m of allMembers) {
    for (const tag of m.preferenceTags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
    }
  }
  const tags = [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)

  return { tags }
})
