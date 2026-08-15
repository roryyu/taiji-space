// GET /api/analytics/overview 运营分析总览指标
// 会员总数 / 有效会员卡数 / 课程总数 / 今日排期数
// 「今日」按业务时区 UTC+8 归一化；活跃卡需同时满足 validTo 未过期
export default defineEventHandler(async () => {
  const now = new Date()
  const { start: todayStart, end: todayEnd } = todayRangeCST(now)

  // 各指标独立 count，并行执行减少响应耗时
  const [memberCount, activeCardCount, courseCount, todayScheduleCount] =
    await Promise.all([
      prisma.member.count(),
      // 活跃会员卡：有效期未过期
      prisma.membershipCard.count({ where: { validTo: { gte: now } } }),
      prisma.course.count(),
      prisma.courseSchedule.count({
        where: { startTime: { gte: todayStart, lt: todayEnd } },
      }),
    ])

  return { memberCount, activeCardCount, courseCount, todayScheduleCount }
})
