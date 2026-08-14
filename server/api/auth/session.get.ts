// GET /api/auth/session 获取当前登录员工
// 全局鉴权中间件已完成 JWT 校验并挂载 event.context.auth
export default defineEventHandler((event) => {
  const auth = event.context.auth as AuthPayload
  return { id: auth.id, username: auth.username, name: auth.name }
})
