// POST /api/staffs 新增员工
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50),
  account: z.string().min(1, '账号不能为空').max(50),
  password: z.string().min(1, '密码不能为空').max(100),
  type: z.enum(['TEACHER', 'MANAGER', 'ADMINISTRATOR']),
  qualification: z.string().max(200).nullable().optional(),
  styleTags: z.array(z.string().max(20)).max(10).default([]),
})

export default defineEventHandler(async (event) => {
  const data = await parseBody(event, schema)
  const hashedPassword = await bcrypt.hash(data.password, 10)
  return prisma.staff.create({
    data: {
      ...data,
      password: hashedPassword,
    },
  })
})
