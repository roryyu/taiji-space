// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: false },

  // 纯管理后台采用 SPA 模式，避免 SSR 下的鉴权水合复杂度
  ssr: false,

  modules: ['@element-plus/nuxt', '@sidebase/nuxt-auth'],

  app: {
    head: {
      title: '太极空间 · 会员课程管理系统',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  // 服务端私有运行时配置（仅 Nitro 可见）
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'taiji-space-dev-secret',
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
