<!-- 工作台：核心运营指标总览 -->
<script setup lang="ts">
/** 总览指标结构（对应 /api/analytics/overview 响应） */
interface Overview {
  memberCount: number
  activeCardCount: number
  courseCount: number
  todayScheduleCount: number
}

const { request } = useApi()
const { data: session } = useAuth()

const overview = ref<Overview | null>(null)
const loading = ref(true)

/** 指标卡片配置（颜色与弱底色取自设计令牌，保持语义化） */
const cards = computed(() => [
  { label: '会员总数', value: overview.value?.memberCount ?? 0, color: 'var(--ts-primary)', bg: 'var(--ts-primary-light)', icon: '👥' },
  { label: '有效会员卡', value: overview.value?.activeCardCount ?? 0, color: 'var(--ts-success)', bg: 'var(--ts-success-light)', icon: '💳' },
  { label: '课程总数', value: overview.value?.courseCount ?? 0, color: '#7c3aed', bg: '#f5f3ff', icon: '📖' },
  { label: '今日排期', value: overview.value?.todayScheduleCount ?? 0, color: 'var(--ts-warning)', bg: 'var(--ts-warning-light)', icon: '📅' },
])

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

onMounted(async () => {
  try {
    overview.value = await request<Overview>('/api/analytics/overview')
  }
  catch { /* 已统一提示 */ }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <!-- 页头：问候语 + 日期 -->
    <div class="page-head">
      <h1 class="page-title">{{ greeting }}，{{ session?.name || '管理员' }}</h1>
      <p class="page-desc">这是太极空间的运营概览，可通过左侧菜单进入各功能模块。</p>
    </div>

    <div class="stat-grid">
      <el-card v-for="c in cards" :key="c.label" shadow="never" class="stat-card">
        <div class="stat-icon" :style="{ background: c.bg }">{{ c.icon }}</div>
        <div class="stat-body">
          <div class="stat-label">{{ c.label }}</div>
          <div class="stat-value" :style="{ color: c.color }">{{ c.value }}</div>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="welcome-card">
      <h2>欢迎使用太极空间会员课程管理系统</h2>
      <p>通过左侧菜单管理会员信息、会员卡、课程、排期、预约、评价与员工，并可查看运营分析。</p>
    </el-card>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ts-foreground);
}

.page-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ts-muted-foreground);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

/* 指标卡片：左图标 + 右文案，shadcn Stat Card 风格 */
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  font-size: 20px;
}

.stat-label {
  color: var(--ts-muted-foreground);
  font-size: 13px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.welcome-card h2 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ts-foreground);
}

.welcome-card p {
  color: var(--ts-muted-foreground);
  margin: 0;
  font-size: 13.5px;
}
</style>
