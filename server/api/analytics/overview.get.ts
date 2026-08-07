// GET /api/analytics/overview 运营分析总览指标
// 会员总数 / 有效会员卡数 / 课程总数 / 今日排期数 / 今日预约数
// 「今日」按业务时区 UTC+8 归一化；活跃卡需同时满足 validTo 未过期；今日预约剔除已取消
export default defineEventHandler(async () => {
  const now = new Date()
  const { start: todayStart, end: todayEnd } = todayRangeCST(now)

  // 各指标独立 count，并行执行减少响应耗时
  const [memberCount, activeCardCount, courseCount, todayScheduleCount, todayBookingCount] =
    await Promise.all([
      prisma.member.count(),
      // 活跃会员卡：状态 ACTIVE 且有效期未过（惰性过期的查询侧兜底）
      prisma.membershipCard.count({ where: { status: 'ACTIVE', validTo: { gte: now } } }),
      prisma.course.count(),
      prisma.courseSchedule.count({
        where: { startTime: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { createdAt: { gte: todayStart, lt: todayEnd }, status: { not: 'CANCELLED' } },
      }),
    ])

  return { memberCount, activeCardCount, courseCount, todayScheduleCount, todayBookingCount }
})
