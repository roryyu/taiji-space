// GET /api/analytics/teachers 教师分析
// 1. 课程完成率：FINISHED 排期数 / 总排期数（排除 CANCELLED）
// 2. 学员评价统计：名下课程的平均评分与评价数量
export default defineEventHandler(async () => {
  const teachers = await prisma.teacher.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  })

  // 排期按课程+状态聚合（排期不直接关联教师，需经课程映射）
  const scheduleGroups = await prisma.courseSchedule.groupBy({
    by: ['courseId', 'status'],
    _count: { _all: true },
  })

  // 课程 → 教师映射，同时服务于排期统计与评价统计
  const courses = await prisma.course.findMany({ select: { id: true, teacherId: true } })
  const courseTeacher = new Map(courses.map((c) => [c.id, c.teacherId]))
  const reviewGroups = await prisma.courseReview.groupBy({
    by: ['courseId'],
    _avg: { rating: true },
    _count: { _all: true },
  })

  // 汇总每位教师的排期状态计数
  const scheduleStat = new Map<number, { finished: number; cancelled: number; all: number }>()
  for (const g of scheduleGroups) {
    const tid = courseTeacher.get(g.courseId)
    if (tid == null) continue
    const stat = scheduleStat.get(tid) ?? { finished: 0, cancelled: 0, all: 0 }
    const n = g._count._all
    stat.all += n
    if (g.status === 'FINISHED') stat.finished += n
    if (g.status === 'CANCELLED') stat.cancelled += n
    scheduleStat.set(tid, stat)
  }

  // 汇总每位教师的评价总数与加权均分
  const reviewStat = new Map<number, { total: number; weightedSum: number }>()
  for (const r of reviewGroups) {
    const tid = courseTeacher.get(r.courseId)
    if (tid == null) continue
    const stat = reviewStat.get(tid) ?? { total: 0, weightedSum: 0 }
    stat.total += r._count._all
    stat.weightedSum += (r._avg.rating ?? 0) * r._count._all
    reviewStat.set(tid, stat)
  }

  const items = teachers.map((t) => {
    const sch = scheduleStat.get(t.id)
    const finished = sch?.finished ?? 0
    const total = (sch?.all ?? 0) - (sch?.cancelled ?? 0)
    const stat = reviewStat.get(t.id)
    return {
      teacherId: t.id,
      name: t.name,
      scheduleTotal: total,
      scheduleFinished: finished,
      completionRate: total > 0 ? Math.round((finished / total) * 1000) / 10 : 0,
      reviewCount: stat?.total ?? 0,
      avgRating: stat && stat.total > 0 ? Math.round((stat.weightedSum / stat.total) * 10) / 10 : null,
    }
  })

  return { items }
})
