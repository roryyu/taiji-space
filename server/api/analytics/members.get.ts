// GET /api/analytics/members 会员分析
// 1. 上课频次 Top 榜（按 COMPLETED 预约数排序）
// 2. 课程偏好标签频次分布
export default defineEventHandler(async () => {
  // 按会员分组统计已完成预约数（数据库聚合，避免全量拉取）
  const grouped = await prisma.booking.groupBy({
    by: ['memberId'],
    where: { status: 'COMPLETED' },
    _count: { _all: true },
    orderBy: { _count: { memberId: 'desc' } },
    take: 10,
  })

  // 批量补齐会员姓名（一次 in 查询，避免 N+1）
  const members = await prisma.member.findMany({
    where: { id: { in: grouped.map((g) => g.memberId) } },
    select: { id: true, name: true, category: true },
  })
  const memberMap = new Map(members.map((m) => [m.id, m]))

  const frequency = grouped.map((g) => ({
    memberId: g.memberId,
    name: memberMap.get(g.memberId)?.name ?? `会员#${g.memberId}`,
    category: memberMap.get(g.memberId)?.category ?? 'NORMAL',
    completedCount: g._count._all,
  }))

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

  return { frequency, tags }
})
