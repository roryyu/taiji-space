// Prisma Client 全局单例
// 避免 dev HMR / 请求级重复实例化导致 PG 连接池泄漏
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '~~/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

// 显式校验 DATABASE_URL，缺失时给出明确报错而不是以 undefined 连接数据库
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 未配置，请先配置 .env（参考 .env.example）')
}

// 从 DATABASE_URL 的 ?schema= 参数解析 PG schema（pg 驱动适配器需显式指定，默认 public）
const dbUrl = process.env.DATABASE_URL
const schema = new URL(dbUrl).searchParams.get('schema') ?? undefined

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: dbUrl }, { schema }),
  })

// 仅开发态挂载到 globalThis，防止热更新时反复创建连接池
if (import.meta.dev) globalForPrisma.__prisma = prisma
