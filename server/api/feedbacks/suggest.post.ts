// POST /api/feedbacks/suggest 基于历史沟通记录与上课频率，生成后续沟通策略建议
import { z } from 'zod'
import OpenAI from 'openai'

const schema = z.object({
  memberId: z.number().int().positive('会员不存在'),
})

export default defineEventHandler(async (event) => {
  const { memberId } = await parseBody(event, schema)

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      cards: {
        include: {
          course: { select: { id: true, name: true } },
          coach: { select: { id: true, name: true } },
          schedules: {
            orderBy: { startTime: 'desc' },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
        },
      },
      feedbacks: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          course: { select: { id: true, name: true } },
          coach: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!member) {
    throw createError({ statusCode: 400, message: '会员不存在' })
  }

  const baseUrl = process.env.MODEL_BASE_URL
  const apiKey = process.env.MODEL_API_KEY
  const model = process.env.MODEL_DEFAULT_MODEL || 'qwen3.8-max'

  if (!baseUrl || !apiKey) {
    throw createError({ statusCode: 500, message: 'AI 服务未配置' })
  }

  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey,
  })

  const activeCards = member.cards.filter(
    card => new Date(card.validTo) >= new Date(new Date().toDateString()),
  )

  const completedCount = activeCards.reduce(
    (sum, card) => sum + card.schedules.filter(s => s.status === 'COMPLETED').length,
    0,
  )
  const pendingCount = activeCards.reduce(
    (sum, card) => sum + card.schedules.filter(s => s.status === 'PENDING').length,
    0,
  )

  const lastCompleted = activeCards
    .flatMap(card => card.schedules.filter(s => s.status === 'COMPLETED'))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]

  const historyText = member.feedbacks.length
    ? member.feedbacks
      .map(
        (f, idx) =>
          `${idx + 1}. ${new Date(f.createdAt).toLocaleString('zh-CN')} | 课程：${f.course?.name || '-'} | 教练：${f.coach?.name || '-'}\n内容：${f.content || '无'}`,
      )
      .join('\n\n')
    : '暂无历史沟通记录'

  const prompt = `你是一名会员运营顾问，擅长通过沟通记录和上课数据分析，给出可落地的客户激活策略。

【会员信息】
- 姓名：${member.name}
- 性别：${member.gender ? (member.gender === 'MALE' ? '男' : member.gender === 'FEMALE' ? '女' : '其他') : '未知'}
- 课程偏好标签：${member.preferenceTags?.length ? member.preferenceTags.join('、') : '无'}
- 备注：${member.remark || '无'}

【会员卡与上课概况】
- 有效会员卡数：${activeCards.length} 张
- 累计已完成课程：${completedCount} 次
- 已预约未上课：${pendingCount} 次
- 最近一次上课：${lastCompleted ? new Date(lastCompleted.startTime).toLocaleString('zh-CN') : '无'}

【历史沟通记录（按时间倒序）】
${historyText}

请根据以上信息，重点围绕"让客户更经常来上课、提升活跃度"这一目标，给出后续沟通策略建议。要求：
1. 一次性建议，无需保存，直接输出即可；
2. 结合历史沟通内容和上课频率，指出客户当前状态；
3. 给出具体、可执行的下一步沟通话术或动作；
4. 建议不超过 300 字，分点说明。`

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是太极空间会员运营顾问，输出简洁、可执行的沟通策略建议。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    })

    const suggestion = completion.choices[0]?.message?.content?.trim() || '暂无建议'
    return { suggestion }
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 500, message: `AI 建议生成失败：${message}` })
  }
})
