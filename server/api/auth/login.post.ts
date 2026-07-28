// POST /api/auth/login 管理员登录
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

export default defineEventHandler(async (event) => {
  const { username, password } = await parseBody(event, schema)

  const user = await prisma.adminUser.findUnique({ where: { username } })
  // 统一提示语，避免暴露用户名是否存在
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw createError({ statusCode: 401, message: '用户名或密码错误' })
  }

  const token = signToken({ id: user.id, username: user.username, name: user.name })
  return { token }
})
