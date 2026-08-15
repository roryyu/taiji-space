// 种子数据脚本：初始化管理员账号与演示数据
// 运行方式：npx prisma db seed（或 npm run db:seed）
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

  // 2. 演示数据：生产环境默认跳过，设置 SEED_DEMO=1 可强制初始化（管理员账号不受该开关限制）
  const seedDemo = process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO === '1'
  if (!seedDemo) {
    console.log('生产环境：已跳过演示数据（如需初始化可设置 SEED_DEMO=1 重新执行）')
  } else {
    // 整段演示数据放入单个事务，任一步失败整体回滚，避免残留脏数据
    await prisma.$transaction(async (tx) => {
      // 幂等控制：事务内判断，已有店铺数据则跳过演示数据
      if ((await tx.store.count()) > 0) {
        console.log('演示数据已存在，跳过')
        return
      }

      // 2.1 店铺
      const [store1, store2] = await Promise.all([
        tx.store.create({
          data: { name: '太极空间·望京店', address: '北京市朝阳区望京 SOHO T1 12 层', businessHours: '09:00-21:00', staffId: null },
        }),
        tx.store.create({
          data: { name: '太极空间·国贸店', address: '北京市朝阳区建国门外大街 1 号', businessHours: '10:00-22:00', staffId: null },
        }),
      ])

      // 2.2 教师（Staff）
      const hashedPassword = await bcrypt.hash('123456', 10)
      const [s1, s2, s3] = await Promise.all([
        tx.staff.create({
          data: { name: '陈静云', qualification: '陈氏太极拳第十二代传人', styleTags: ['陈氏太极', '推手', '器械'], account: 'chenjingyun', password: hashedPassword, type: 'TEACHER' },
        }),
        tx.staff.create({
          data: { name: '杨明德', qualification: '杨氏太极拳嫡传弟子', styleTags: ['杨氏太极', '养生', '慢架'], account: 'yangmingde', password: hashedPassword, type: 'TEACHER' },
        }),
        tx.staff.create({
          data: { name: '吴若兰', qualification: '国家武术套路冠军', styleTags: ['太极剑', '基本功', '青少年'], account: 'wuruolan', password: hashedPassword, type: 'TEACHER' },
        }),
      ])

      // 2.3 会员
      const memberSeed = [
        { name: '张伟', phone: '13800000001', channel: 'REFERRAL', preferenceTags: ['陈氏太极', '推手'], remark: '膝盖旧伤，注意强度' },
        { name: '李娜', phone: '13800000002', channel: 'ONLINE', preferenceTags: ['养生', '慢架'], remark: null },
        { name: '王强', phone: '13800000003', channel: 'WALK_IN', preferenceTags: ['器械', '太极剑'], remark: '偏好晚间课程' },
        { name: '赵敏', phone: '13800000004', channel: 'ACTIVITY', preferenceTags: ['基本功'], remark: null },
        { name: '刘洋', phone: '13800000005', channel: 'REFERRAL', preferenceTags: ['青少年', '基本功'], remark: '学生会员' },
      ] as const
      const members = []
      for (const m of memberSeed) {
        members.push(await tx.member.create({ data: { ...m, preferenceTags: [...m.preferenceTags] } }))
      }

      // 2.4 课程（先于会员卡创建，因为卡需要关联课程）
      const [c1, c2, c3] = await Promise.all([
        tx.course.create({
          data: { name: '陈氏太极拳老架一路', description: '传统陈氏老架一路 74 式，适合有一定基础的学员系统研习。' },
        }),
        tx.course.create({
          data: { name: '杨氏太极养生班', description: '以杨氏 24 式为核心的养生课程，节奏舒缓，适合零基础。' },
        }),
        tx.course.create({
          data: { name: '太极剑入门', description: '32 式太极剑入门，包含剑法基础与套路分解教学。' },
        }),
      ])

      // 2.5 会员卡
      const now = new Date()
      const yearLater = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
      const cardSeed = [
        { memberId: members[0]!.id, storeId: store1.id, courseId: c1.id, coachId: s1.id, totalAmount: 3000, totalSessions: 30, giftSessions: 5 },
        { memberId: members[1]!.id, storeId: store1.id, courseId: c2.id, coachId: s2.id, totalAmount: 1500, totalSessions: 20, giftSessions: 3 },
        { memberId: members[2]!.id, storeId: store2.id, courseId: c3.id, coachId: s3.id, totalAmount: 2000, totalSessions: 24, giftSessions: 4 },
        { memberId: members[3]!.id, storeId: store1.id, courseId: c1.id, coachId: s1.id, totalAmount: 1000, totalSessions: 10, giftSessions: 2 },
      ] as const
      for (const [i, c] of cardSeed.entries()) {
        const card = await tx.membershipCard.create({
          data: {
            cardNo: `TJ${Date.now()}${String(i).padStart(2, '0')}`,
            memberId: c.memberId,
            storeId: c.storeId,
            courseId: c.courseId,
            coachId: c.coachId,
            totalAmount: c.totalAmount,
            totalSessions: c.totalSessions,
            giftSessions: c.giftSessions,
            validFrom: now,
            validTo: yearLater,
          },
        })
        await tx.cardTransaction.create({
          data: { cardId: card.id, type: 'RECHARGE', amount: c.totalAmount, remark: '开卡充值' },
        })
      }

      // 2.6 排期（关联到会员卡和会员）
      const day = 24 * 3600 * 1000
      const at = (offsetDays: number, hour: number) => {
        const d = new Date(now.getTime() + offsetDays * day)
        d.setHours(hour, 0, 0, 0)
        return d
      }

      // 获取会员卡信息用于关联排期
      const cards = await tx.membershipCard.findMany({
        where: { memberId: { in: members.slice(0, 4).map(m => m.id) } },
        select: { id: true, memberId: true, courseId: true },
      })

      if (cards.length >= 4) {
        // 为每个会员卡创建排期
        await tx.courseSchedule.createMany({
          data: [
            { cardId: cards[0]!.id, memberId: cards[0]!.memberId, courseId: cards[0]!.courseId, startTime: at(-7, 10), endTime: at(-7, 11) },
            { cardId: cards[0]!.id, memberId: cards[0]!.memberId, courseId: cards[0]!.courseId, startTime: at(-3, 19), endTime: at(-3, 20) },
            { cardId: cards[1]!.id, memberId: cards[1]!.memberId, courseId: cards[1]!.courseId, startTime: at(2, 10), endTime: at(2, 11) },
            { cardId: cards[2]!.id, memberId: cards[2]!.memberId, courseId: cards[2]!.courseId, startTime: at(3, 15), endTime: at(3, 16) },
          ],
        })
      }

      // 2.7 课程评价
      await tx.courseReview.createMany({
        data: [
          { memberId: members[0]!.id, courseId: c1.id, rating: 5, suggestion: '陈老师讲解细致，希望增加推手环节。' },
          { memberId: members[1]!.id, courseId: c1.id, rating: 4, suggestion: '节奏稍快，建议基础动作多复习。' },
          { memberId: members[1]!.id, courseId: c2.id, rating: 5, suggestion: '非常放松，适合下班后练习。' },
        ],
      })

      // 2.9 系统参数
      await tx.systemParam.createMany({
        data: [
          { key: 'booking.cancel.deadline.hours', value: '2', description: '开课前可取消预约的小时数' },
          { key: 'card.expire.remind.days', value: '30', description: '会员卡到期提醒提前天数' },
          { key: 'site.name', value: '太极空间', description: '系统显示名称' },
        ],
        skipDuplicates: true,
      })
    })
  }

  console.log('种子数据初始化完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
