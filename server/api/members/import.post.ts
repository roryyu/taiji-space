// POST /api/members/import 会员批量导入
// 入参：CSV 文本，每行格式「姓名,手机号,渠道」（渠道可选，支持中文标签）
// 返回逐行导入结果明细；单次最多 1000 行，逐行校验、失败不影响其他行
import { z } from 'zod'

const schema = z.object({
  csv: z.string().min(1, '导入内容不能为空'),
})

const rowSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
})

export default defineEventHandler(async (event) => {
  const { csv } = await parseBody(event, schema)

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length > 1000) {
    throw createError({ statusCode: 400, message: '单次最多导入 1000 行' })
  }

  const results: { line: number; name: string; success: boolean; message: string }[] = []
  let successCount = 0

  for (const [index, line] of lines.entries()) {
    const [name = '', phone = '', channelText = ''] = line
      .split(/[,，]/)
      .map((s) => s.trim())

    const parsed = rowSchema.safeParse({ name, phone })
    if (!parsed.success) {
      results.push({ line: index + 1, name, success: false, message: parsed.error.issues[0]?.message ?? '格式错误' })
      continue
    }

    // 渠道兼容中文标签与枚举值，非法值回退默认
    const channel = (channelText && labelToEnum(ChannelLabels, channelText)) || 'OTHER'

    try {
      const dup = await prisma.member.findUnique({ where: { phone: parsed.data.phone } })
      if (dup) {
        results.push({ line: index + 1, name, success: false, message: '手机号已存在，已跳过' })
        continue
      }
      await prisma.member.create({
        data: { name: parsed.data.name, phone: parsed.data.phone, channel, preferenceTags: [] },
      })
      successCount++
      results.push({ line: index + 1, name, success: true, message: '导入成功' })
    } catch (err) {
      // 区分唯一约束冲突与其他错误，便于定位问题行
      const message = (err as { code?: string } | null)?.code === 'P2002' ? '手机号已存在' : '写入失败'
      results.push({ line: index + 1, name, success: false, message })
    }
  }

  return { total: lines.length, successCount, failCount: lines.length - successCount, results }
})
