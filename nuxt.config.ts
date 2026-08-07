// https://nuxt.com/docs/api/configuration/nuxt-config

// JWT 签名密钥必须通过环境变量注入；生产环境严禁静默回退到硬编码密钥（公开密钥等价于允许伪造任意管理员令牌）
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 未设置：生产环境请配置 32 字符以上的强随机密钥')
}

export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: false },

  // 纯管理后台采用 SPA 模式，避免 SSR 下的鉴权水合复杂度
  ssr: false,

  modules: ['@element-plus/nuxt', '@sidebase/nuxt-auth'],

  // 全局样式初始化（消除浏览器默认 body margin 等差异）
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: '太极空间 · 会员课程管理系统',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  // 服务端私有运行时配置（仅 Nitro 可见）；兜底值仅在开发环境生效
  runtimeConfig: {
    jwtSecret: jwtSecret || 'taiji-space-dev-only-secret',
  },

  // @sidebase/nuxt-auth local provider：token 由 /api/auth/login 签发
  auth: {
    isEnabled: true,
    baseURL: '/api/auth',
    provider: {
      type: 'local',
      endpoints: {
        signIn: { path: '/login', method: 'post' },
        signOut: { path: '/logout', method: 'post' },
        signUp: false,
        getSession: { path: '/session', method: 'get' },
      },
      token: {
        signInResponseTokenPointer: '/token',
        type: 'Bearer',
        headerName: 'Authorization',
        maxAgeInSeconds: 60 * 60 * 24 * 7, // 与 JWT 有效期一致：7 天
      },
      pages: { login: '/login' },
      session: {
        dataType: { id: 'number', username: 'string', name: 'string' },
      },
    },
    // 全局路由守卫：未登录一律重定向到 /login
    globalAppMiddleware: true,
  },

  elementPlus: {
    importStyle: 'css',
  },
})
