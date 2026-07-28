// GET /api/analytics/courses 课程分析
// 课程报名人数统计（非 CANCELLED 预约）+ 排期场次数
export default defineEventHandler(async () => {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      name: true,
      capacity: true,
      teacher: { select: { name: true } },
      store: { select: { name: true } },
      _count: { select: { schedules: true } },
    },
    orderBy: { id: 'asc' },
  })

  // 各排期的有效预约数（数据库聚合），经排期→课程映射汇总
  const bookingGroups = await prisma.booking.groupBy({
    by: ['scheduleId'],
    where: { status: { not: 'CANCELLED' } },
    _count: { _all: true },
  })
  const schedules = await prisma.courseSchedule.findMany({
    select: { id: true, courseId: true },
  })
  const scheduleCourse = new Map(schedules.map((s) => [s.id, s.courseId]))

  const bookingCount = new Map<number, number>()
  for (const g of bookingGroups) {
    const cid = scheduleCourse.get(g.scheduleId)
    if (cid == null) continue
    bookingCount.set(cid, (bookingCount.get(cid) ?? 0) + g._count._all)
  }

  const items = courses.map((c) => ({
    courseId: c.id,
    name: c.name,
    teacherName: c.teacher.name,
    storeName: c.store.name,
    capacity: c.capacity,
    scheduleCount: c._count.schedules,
    bookingCount: bookingCount.get(c.id) ?? 0,
  }))

  return { items }
})
