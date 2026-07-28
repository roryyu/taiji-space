// 统一 API 请求封装
// 1. 自动附加 Bearer Token（来自 nuxt-auth）
// 2. 统一错误提示（ElMessage），401 时跳转登录
import { ElMessage } from 'element-plus'

/** 从服务端错误响应中提取可读信息 */
function extractMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; message?: string }
  return e?.data?.message || e?.message || '请求失败，请稍后重试'
}

/** 请求选项（方法/查询/请求体/请求头） */
interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, unknown>
  body?: unknown
  headers?: Record<string, string>
}

// 绕开 Nitro 类型化路由对动态 url 的深度推导（会导致 TS 实例化栈溢出）
const rawFetch = $fetch as unknown as (url: string, options?: ApiOptions) => Promise<unknown>

export function useApi() {
  const { token, signOut } = useAuth()

  /**
   * 发起请求；失败时弹出错误提示并抛出异常（调用方可 catch 做兜底）
   * @param url API 路径
   * @param options 请求选项
   */
  async function request<T>(url: string, options: ApiOptions = {}): Promise<T> {
    try {
      return (await rawFetch(url, {
        ...options,
        headers: {
          ...options.headers,
          // nuxt-auth 的 token 已含 "Bearer " 前缀
          ...(token.value ? { Authorization: token.value } : {}),
        },
      })) as T
    }
    catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        await signOut({ callbackUrl: '/login' })
      }
      else {
        ElMessage.error(extractMessage(err))
      }
      throw err
    }
  }

  return { request }
}
