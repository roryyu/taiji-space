// PUT /api/staffs/:id 编辑员工
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(50),
  account: z.string().min(1, '账号不能为空').max(50),
  type: z.enum(['TEACHER', 'MANAGER', 'ADMINISTRATOR']),
  qualification: z.string().max(200).nullable().optional(),
  styleTags: z.array(z.string().max(20)).max(10).default([]),
})

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const data = await parseBody(event, schema)

  const staff = await prisma.staff.findUnique({ where: { id } })
  if (!staff) throw createError({ statusCode: 404, message: '员工不存在' })

  return prisma.staff.update({ where: { id }, data })
})
