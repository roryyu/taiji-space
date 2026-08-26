// 枚举值 → 中文标签映射（前后端共享，Nuxt shared 目录自动导入）

export const MemberCategoryLabels = { NORMAL: '普通会员', VIP: 'VIP', SVIP: 'SVIP' } as const

export const GenderLabels = { MALE: '男', FEMALE: '女', OTHER: '其他' } as const

export const ChannelLabels = {
  WALK_IN: '到店咨询',
  REFERRAL: '转介绍',
  ONLINE: '线上引流',
  ACTIVITY: '活动获客',
  OTHER: '其他',
} as const

export const TxTypeLabels = {
  RECHARGE: '充值',
  DEDUCT: '扣减',
  EXTEND: '延期',
} as const

export const StaffTypeLabels = { TEACHER: '教练', MANAGER: '经理', ADMINISTRATOR: '管理员' } as const

export const ScheduleStatusLabels = { PENDING: '未上课', COMPLETED: '已上课' } as const

/** 由中文标签反查枚举值（批量导入时兼容中文输入） */
export function labelToEnum<T extends Record<string, string>>(labels: T, text: string): keyof T | undefined {
  if (text in labels) return text as keyof T
  return (Object.keys(labels) as (keyof T)[]).find((k) => labels[k] === text)
}
