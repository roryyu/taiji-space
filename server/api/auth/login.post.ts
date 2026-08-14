// POST /api/auth/login 员工登录
// 安全策略：连续失败锁定（防暴力破解）+ 恒定耗时比较（防用户名枚举时序旁路）
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  username: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
})

const MAX_FAILURES = 5 // 连续失败次数上限
const LOCK_WINDOW_MS = 15 * 60 * 1000 // 触发后锁定时长：15 分钟

// 单实例管理后台场景，采用内存锁定记录（按 账号+IP 维度）
const failures = new Map<string, { count: number, lockedUntil: number }>()

// 账号不存在时对 dummy 哈希执行一次比较，保证两条路径耗时一致
const DUMMY_HASH = bcrypt.hashSync('taiji-space-timing-guard', 10)

function assertNotLocked(key: string) {
  const record = failures.get(key)
  if (!record) return
  if (record.lockedUntil > Date.now()) {
    throw createError({ statusCode: 429, message: '失败次数过多，请 15 分钟后再试' })
  }
  failures.delete(key)
}

export default defineEventHandler(async (event) => {
  const { username, password } = await parseBody(event, schema)

  const lockKey = `${username}:${getRequestIP(event, { xForwardedFor: true })}`
  assertNotLocked(lockKey)

  const user = await prisma.staff.findUnique({ where: { account: username } })
  // 统一提示语，避免暴露账号是否存在
  const matched = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)
  if (!user || !matched) {
    const record = failures.get(lockKey) ?? { count: 0, lockedUntil: 0 }
    record.count += 1
    if (record.count >= MAX_FAILURES) {
      record.lockedUntil = Date.now() + LOCK_WINDOW_MS
      record.count = 0
    }
    failures.set(lockKey, record)
    throw createError({ statusCode: 401, message: '账号或密码错误' })
  }

  failures.delete(lockKey)
  const token = signToken({ id: user.id, username: user.account, name: user.name })
  return { token }
})
