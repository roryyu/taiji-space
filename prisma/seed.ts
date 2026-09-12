// 种子数据脚本：初始化管理员账号与业务主数据（门店/教练/课程/系统参数）
// 数据来源：客资中心_用户信息.csv（门店列、备注中带课教练、留资来源详情中的团购商品）
// 运行方式：npx prisma db seed（或 npm run db:seed）
// 说明：全部按业务唯一键幂等写入，重复执行不会覆盖已修改的数据；暂不初始化 Member / MembershipCard
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'

// 显式校验 DATABASE_URL，避免以 undefined 连接数据库导致难以定位的报错
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 未配置，请先配置 .env（参考 .env.example）')
}

// 从 DATABASE_URL 的 ?schema= 参数解析 PG schema（pg 驱动适配器需显式指定）
const dbUrl = process.env.DATABASE_URL
const schema = new URL(dbUrl).searchParams.get('schema') ?? undefined
const adapter = new PrismaPg({ connectionString: dbUrl }, { schema })
const prisma = new PrismaClient({ adapter })

// ---------- 主数据（来源：客资中心_用户信息.csv） ----------

// 门店：CSV「门店」列去重，名称与客资导出保持完全一致，便于后续按名称匹配
const storeSeed = [
  { name: '叁时柒太极空间-徐汇西岸馆', address: '上海市徐汇区（西岸馆）', businessHours: '09:00-21:00' },
  { name: '叁时柒太极空间-杨高南路馆', address: '上海市浦东新区（杨高南路馆）', businessHours: '09:00-21:00' },
  { name: '叁时柒太极空间-四川北路馆', address: '上海市虹口区（四川北路馆）', businessHours: '09:00-21:00' },
] as const

// 教练：CSV「备注」中出现的带课教练
// 云淑：太极剑/器械体验带教（朱成月太极剑、筱姽剑花体验、落颜双人体验）
// 资明：太极拳/青少年体验带教（张小姐太极、侯女士小孩三年级体验）
// 若兰：太极拳体验带教（康小姐太极）
const teacherSeed = [
  { name: '云淑', account: 'yunshu', qualification: null, styleTags: ['太极剑', '太极扇', '器械'] },
  { name: '资明', account: 'ziming', qualification: null, styleTags: ['太极拳', '青少年'] },
  { name: '若兰', account: 'ruolan', qualification: null, styleTags: ['太极拳', '养生'] },
] as const

// 课程：CSV「留资来源详情」中的团购商品拆分而来
// ①【中式养生】专业太极拳1对1｜零基础｜心肺减肥防摔
// ②【学技能】太极剑｜太极扇｜逍遥扇｜潮太极1对1体验
// ③【道家八段锦】0基础私教｜焦虑抑郁｜气血｜脏腑调理
// ④【长寿功｜金刚功｜易筋经｜五禽戏｜8次卡】私教课
const courseSeed = [
  { name: '专业太极拳1对1', description: '中式养生系列，零基础可学，侧重心肺锻炼、减肥与防摔。' },
  { name: '太极剑1对1', description: '学技能系列 1对1 体验课，含太极剑剑法基础与剑花教学。' },
  { name: '太极扇1对1', description: '学技能系列 1对1 体验课，太极扇套路教学。' },
  { name: '逍遥扇1对1', description: '学技能系列 1对1 体验课，逍遥扇套路教学。' },
  { name: '潮太极1对1', description: '学技能系列 1对1 体验课，年轻化潮太极教学。' },
  { name: '道家八段锦私教', description: '0基础私教，侧重焦虑抑郁调理、气血与脏腑调理。' },
  { name: '长寿功私教', description: '传统养生功私教课（长寿功/金刚功/易筋经/五禽戏 8次卡系列）。' },
  { name: '金刚功私教', description: '传统养生功私教课（长寿功/金刚功/易筋经/五禽戏 8次卡系列）。' },
  { name: '易筋经私教', description: '传统养生功私教课（长寿功/金刚功/易筋经/五禽戏 8次卡系列）。' },
  { name: '五禽戏私教', description: '传统养生功私教课（长寿功/金刚功/易筋经/五禽戏 8次卡系列）。' },
] as const

// 系统参数
const systemParamSeed = [
  { key: 'booking.cancel.deadline.hours', value: '2', description: '开课前可取消预约的小时数' },
  { key: 'card.expire.remind.days', value: '30', description: '会员卡到期提醒提前天数' },
  { key: 'site.name', value: '太极空间', description: '系统显示名称' },
] as const

async function main() {
  // 1. 初始管理员账号：写入 Staff 表（type: ADMINISTRATOR）
  const existed = await prisma.staff.findUnique({ where: { account: 'admin' }, select: { id: true } })
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  await prisma.staff.upsert({
    where: { account: 'admin' },
    // update 为空对象：重复执行 seed 不覆盖已修改的管理员密码
    update: {},
    create: { name: '系统管理员', account: 'admin', password: passwordHash, type: 'ADMINISTRATOR' },
  })
  if (!existed) {
    if (process.env.SEED_ADMIN_PASSWORD) {
      console.log('初始管理员账号 admin，初始密码：已按环境变量 SEED_ADMIN_PASSWORD 指定')
    } else {
      console.log(`初始管理员账号 admin，初始密码：${adminPassword}（随机生成，请妥善保管；也可通过环境变量 SEED_ADMIN_PASSWORD 指定）`)
    }
  }

  // 2. 业务主数据：整段放入单个事务，任一步失败整体回滚；按唯一键幂等，可重复执行
  const staffPassword = process.env.SEED_STAFF_PASSWORD || '123456'
  const staffPasswordHash = await bcrypt.hash(staffPassword, 10)

  const result = await prisma.$transaction(async (tx) => {
    // 2.1 门店（按名称唯一键 upsert，已存在则保留原值）
    let storeCreated = 0
    for (const store of storeSeed) {
      const before = await tx.store.findUnique({ where: { name: store.name }, select: { id: true } })
      await tx.store.upsert({
        where: { name: store.name },
        update: {},
        create: { ...store, staffId: null },
      })
      if (!before) storeCreated++
    }

    // 2.2 教练（按登录账号唯一键 upsert）
    let teacherCreated = 0
    for (const teacher of teacherSeed) {
      const before = await tx.staff.findUnique({ where: { account: teacher.account }, select: { id: true } })
      await tx.staff.upsert({
        where: { account: teacher.account },
        update: {},
        create: {
          name: teacher.name,
          account: teacher.account,
          password: staffPasswordHash,
          qualification: teacher.qualification,
          styleTags: [...teacher.styleTags],
          type: 'TEACHER',
        },
      })
      if (!before) teacherCreated++
    }

    // 2.3 课程（Course 无名称唯一约束，先按名称查重再创建）
    let courseCreated = 0
    for (const course of courseSeed) {
      const exists = await tx.course.findFirst({ where: { name: course.name }, select: { id: true } })
      if (!exists) {
        await tx.course.create({ data: { ...course } })
        courseCreated++
      }
    }

    // 2.4 系统参数
    await tx.systemParam.createMany({ data: [...systemParamSeed], skipDuplicates: true })

    return { storeCreated, teacherCreated, courseCreated }
  })

  console.log(
    `主数据初始化完成：门店新建 ${result.storeCreated} 家（共 ${storeSeed.length} 家），` +
      `教练新建 ${result.teacherCreated} 人（初始密码：${process.env.SEED_STAFF_PASSWORD ? '已按环境变量 SEED_STAFF_PASSWORD 指定' : '123456'}），` +
      `课程新建 ${result.courseCreated} 门（共 ${courseSeed.length} 门）`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
