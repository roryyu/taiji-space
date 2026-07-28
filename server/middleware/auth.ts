// 全局 API 鉴权中间件：除登录接口外，/api/** 一律要求有效 JWT
export default defineEventHandler((event) => {
  const path = event.path

  // 仅拦截 API 请求，静态资源与页面路由放行
  if (!path.startsWith('/api/')) return

  // 登录接口本身无需鉴权
  if (path.startsWith('/api/auth/login')) return

  const authHeader = getHeader(event, 'authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    throw createError({ statusCode: 401, message: '未登录或登录已过期' })
  }

  // 将当前登录管理员信息挂载到请求上下文，供后续 handler 使用
  event.context.auth = payload
})
