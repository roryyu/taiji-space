// GET /api/options 下拉选项数据源
// 一次返回店铺/教师/会员/课程精简列表，供前端各表单选择器复用
export default defineEventHandler(async () => {
  const [stores, teachers, members, courses] = await Promise.all([
    prisma.store.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } }),
    prisma.teacher.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { id: 'asc' },
    }),
    prisma.member.findMany({
      select: { id: true, name: true, phone: true },
      orderBy: { id: 'desc' }, // 取最近录入的会员，避免 asc 截断导致新会员无法被选中
      take: 500, // 兜底上限，防止会员量过大拖垮接口
    }),
    prisma.course.findMany({
      select: { id: true, name: true, capacity: true, teacherId: true, storeId: true },
      orderBy: { id: 'asc' },
    }),
  ])

  return { stores, teachers, members, courses }
})
