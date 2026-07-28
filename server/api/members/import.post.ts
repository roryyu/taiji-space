// POST /api/members/import 会员批量导入
// 入参：CSV 文本，每行格式「姓名,手机号,分类,渠道,门店名称」（后三列可选，支持中文标签）
// 返回逐行导入结果明细；单次最多 1000 行，逐行校验、失败不影响其他行
import { z } from 'zod'

const schema = z.object({
  csv: z.string().min(1, '导入内容不能为空'),
  defaultStoreId: z.number().int().positive('请选择默认门店'),
})

const rowSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
})

export default defineEventHandler(async (event) => {
  const { csv, defaultStoreId } = await parseBody(event, schema)

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length > 1000) {
    throw createError({ statusCode: 400, message: '单次最多导入 1000 行' })
  }

  // 预取门店映射（按名称匹配第 5 列）
  const stores = await prisma.store.findMany({ select: { id: true, name: true } })
  const storeByName = new Map(stores.map((s) => [s.name, s.id]))

  const results: { line: number; name: string; success: boolean; message: string }[] = []
  let successCount = 0

  for (const [index, line] of lines.entries()) {
    const [name = '', phone = '', categoryText = '', channelText = '', storeName = ''] = line
      .split(/[,，]/)
      .map((s) => s.trim())

    const parsed = rowSchema.safeParse({ name, phone })
    if (!parsed.success) {
      results.push({ line: index + 1, name, success: false, message: parsed.error.issues[0]?.message ?? '格式错误' })
      continue
    }

    // 分类/渠道兼容中文标签与枚举值，非法值回退默认
    const category = (categoryText && labelToEnum(MemberCategoryLabels, categoryText)) || 'NORMAL'
    const channel = (channelText && labelToEnum(ChannelLabels, channelText)) || 'OTHER'
    const storeId = (storeName && storeByName.get(storeName)) || defaultStoreId

    try {
      const dup = await prisma.member.findUnique({ where: { phone: parsed.data.phone } })
      if (dup) {
        results.push({ line: index + 1, name, success: false, message: '手机号已存在，已跳过' })
        continue
      }
      await prisma.member.create({
        data: { name: parsed.data.name, phone: parsed.data.phone, category, channel, storeId, preferenceTags: [] },
      })
      successCount++
      results.push({ line: index + 1, name, success: true, message: '导入成功' })
    } catch {
      results.push({ line: index + 1, name, success: false, message: '写入失败' })
    }
  }

  return { total: lines.length, successCount, failCount: lines.length - successCount, results }
})
