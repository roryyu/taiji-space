// GET /api/analytics/courses 课程分析
// 课程排期场次数统计
export default defineEventHandler(async () => {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { schedules: true } },
    },
    orderBy: { id: 'asc' },
  })

  const items = courses.map((c) => ({
    courseId: c.id,
    name: c.name,
    scheduleCount: c._count.schedules,
  }))

  return { items }
})
