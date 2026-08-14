// POST /api/auth/logout 登出
// JWT 为无状态令牌，服务端无需注销动作，由前端丢弃 token 即可
export default defineEventHandler(() => {
  return { ok: true }
})
