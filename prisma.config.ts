// Prisma 7 配置文件：负责加载 .env、声明 schema / seed 命令与数据库连接适配器
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// 显式校验 DATABASE_URL，避免以 undefined 连接数据库导致难以定位的报错
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 未配置，请先配置 .env（参考 .env.example）')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    // Node 24+ 原生支持 TS 类型剥离，可直接执行 .ts 种子脚本
    seed: 'node prisma/seed.ts',
  },
  // Prisma 7：db push / migrate 等 CLI 命令通过 datasource.url 连接数据库（schema 中不再声明 url）
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
