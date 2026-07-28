// 枚举值 → 中文标签映射（前后端共享，Nuxt shared 目录自动导入）

export const MemberCategoryLabels = { NORMAL: '普通会员', VIP: 'VIP', SVIP: 'SVIP' } as const

export const ChannelLabels = {
  WALK_IN: '到店咨询',
  REFERRAL: '转介绍',
  ONLINE: '线上引流',
  ACTIVITY: '活动获客',
  OTHER: '其他',
} as const

export const CardTypeLabels = { COUNT: '次卡', PERIOD: '期限卡', STORED: '储值卡' } as const

export const CardStatusLabels = { ACTIVE: '正常', FROZEN: '冻结', EXPIRED: '过期' } as const

export const TxTypeLabels = {
  RECHARGE: '充值',
  DEDUCT: '扣减',
  FREEZE: '冻结',
  UNFREEZE: '解冻',
  EXTEND: '延期',
} as const

export const StageLabels = { BASIC: '基础', INTERMEDIATE: '进阶', ADVANCED: '高级' } as const

export const ScheduleStatusLabels = { OPEN: '开放预约', FINISHED: '已结课', CANCELLED: '已取消' } as const

export const BookingStatusLabels = { BOOKED: '已预约', CANCELLED: '已取消', COMPLETED: '已完成' } as const

export const TeacherStatusLabels = { ACTIVE: '在职', INACTIVE: '离职' } as const

/** 由中文标签反查枚举值（批量导入时兼容中文输入） */
export function labelToEnum<T extends Record<string, string>>(labels: T, text: string): keyof T | undefined {
  if (text in labels) return text as keyof T
  return (Object.keys(labels) as (keyof T)[]).find((k) => labels[k] === text)
}
