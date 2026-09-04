// GET /api/analytics/teachers 教师分析
// 返回教师列表，统计数据暂时为零（Course 不再关联 teacherId）
export default defineEventHandler(async () => {
  const teachers = await prisma.staff.findMany({
    where: { type: 'TEACHER' },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  })

  const items = teachers.map((t) => ({
    staffId: t.id,
    name: t.name,
    scheduleTotal: 0,
    scheduleFinished: 0,
    completionRate: 0,
    reviewCount: 0,
    avgRating: null,
  }))

  return { items }
})
