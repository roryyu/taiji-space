// 业务日期归一化工具：业务时区固定为 UTC+8（Asia/Shanghai）
// 前端日期以 "YYYY-MM-DD" 传递，z.coerce.date() 会解析为 UTC 零点；
// 若直接与 new Date() 比较，在 UTC+8 部署下会提前约 8 小时判定过期。
// 因此所有"日"粒度的业务日期统一归一化为业务日的起止时刻后再存储/比较。
const DAY_MS = 24 * 60 * 60 * 1000
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000

/** 取日期所在业务日（UTC+8）的起始时刻 00:00:00.000 */
export function startOfDayCST(date: Date): Date {
  const dayIndex = Math.floor((date.getTime() + TZ_OFFSET_MS) / DAY_MS)
  return new Date(dayIndex * DAY_MS - TZ_OFFSET_MS)
}

/** 取日期所在业务日（UTC+8）的结束时刻 23:59:59.999 */
export function endOfDayCST(date: Date): Date {
  return new Date(startOfDayCST(date).getTime() + DAY_MS - 1)
}

/** 今日（UTC+8）区间：start 含、end 不含（配合 gte/lt 使用） */
export function todayRangeCST(now: Date = new Date()): { start: Date, end: Date } {
  const start = startOfDayCST(now)
  return { start, end: new Date(start.getTime() + DAY_MS) }
}
