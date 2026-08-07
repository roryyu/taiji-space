<!-- 工作台：核心运营指标总览 -->
<script setup lang="ts">
/** 总览指标结构（对应 /api/analytics/overview 响应） */
interface Overview {
  memberCount: number
  activeCardCount: number
  courseCount: number
  todayScheduleCount: number
  todayBookingCount: number
}

const { request } = useApi()

const overview = ref<Overview | null>(null)
const loading = ref(true)

/** 指标卡片配置 */
const cards = computed(() => [
  { label: '会员总数', value: overview.value?.memberCount ?? 0, color: '#1677ff' },
  { label: '有效会员卡', value: overview.value?.activeCardCount ?? 0, color: '#52c41a' },
  { label: '课程总数', value: overview.value?.courseCount ?? 0, color: '#722ed1' },
  { label: '今日排期', value: overview.value?.todayScheduleCount ?? 0, color: '#fa8c16' },
  { label: '今日预约', value: overview.value?.todayBookingCount ?? 0, color: '#eb2f96' },
])

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
    <div class="stat-grid">
      <el-card v-for="c in cards" :key="c.label" shadow="hover" class="stat-card">
        <div class="stat-value" :style="{ color: c.color }">{{ c.value }}</div>
        <div class="stat-label">{{ c.label }}</div>
      </el-card>
    </div>

    <el-card shadow="never" class="welcome-card">
      <h2>欢迎使用太极空间会员课程管理系统</h2>
      <p>通过左侧菜单管理会员信息、会员卡、课程、排期、预约、评价与教师，并可查看运营分析。</p>
    </el-card>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
}

.stat-label {
  color: #8c8c8c;
  font-size: 13px;
  margin-top: 4px;
}

.welcome-card {
  margin-top: 8px;
}

.welcome-card h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.welcome-card p {
  color: #595959;
  margin: 0;
}
</style>
