// GET /api/analytics/overview 运营分析总览指标
// 会员总数 / 有效会员卡数 / 课程总数 / 今日排期数 / 今日预约数
export default defineEventHandler(async () => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // 各指标独立 count，并行执行减少响应耗时
  const [memberCount, activeCardCount, courseCount, todayScheduleCount, todayBookingCount] =
    await Promise.all([
      prisma.member.count(),
      prisma.membershipCard.count({ where: { status: 'ACTIVE' } }),
      prisma.course.count(),
      prisma.courseSchedule.count({
        where: { startTime: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { createdAt: { gte: todayStart, lt: todayEnd } },
      }),
    ])

  return { memberCount, activeCardCount, courseCount, todayScheduleCount, todayBookingCount }
})
