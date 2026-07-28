// 请求参数校验工具：基于 zod 统一处理入参
import type { H3Event } from 'h3'
import type { z } from 'zod'

/** 校验请求体，失败抛出 400 */
export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.output<T>> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    const first = result.error.issues[0]
    throw createError({
      statusCode: 400,
      message: first ? `参数错误：${first.path.join('.')} ${first.message}` : '参数错误',
    })
  }
  return result.data
}

/** 校验查询参数，失败抛出 400 */
export function parseQuery<T extends z.ZodType>(event: H3Event, schema: T): z.output<T> {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) {
    const first = result.error.issues[0]
    throw createError({
      statusCode: 400,
      message: first ? `参数错误：${first.path.join('.')} ${first.message}` : '参数错误',
    })
  }
  return result.data
}

/** 从路由参数解析正整数 id，失败抛出 400 */
export function parseId(event: H3Event, name = 'id'): number {
  const raw = getRouterParam(event, name)
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: `非法的 ${name}` })
  }
  return id
}

/** 通用分页查询参数：page 从 1 开始，pageSize 上限 100 */
export function parsePagination(event: H3Event): { page: number; pageSize: number; skip: number; take: number } {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}
