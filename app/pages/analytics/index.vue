<!-- 运营分析：会员分析 / 教师分析 / 课程分析 -->
<script setup lang="ts">
/** 会员分析响应 */
interface MemberAnalytics {
  frequency: { memberId: number; name: string; category: keyof typeof MemberCategoryLabels; completedCount: number }[]
  tags: { tag: string; count: number }[]
}

/** 教师分析响应 */
interface TeacherAnalytics {
  items: {
    teacherId: number
    name: string
    scheduleTotal: number
    scheduleFinished: number
    completionRate: number
    reviewCount: number
    avgRating: number | null
  }[]
}

/** 课程分析响应 */
interface CourseAnalytics {
  items: {
    courseId: number
    name: string
    teacherName: string
    storeName: string
    capacity: number
    scheduleCount: number
    bookingCount: number
  }[]
}

const { request } = useApi()

const activeTab = ref('members')
const loading = ref(false)

const memberData = ref<MemberAnalytics | null>(null)
const teacherData = ref<TeacherAnalytics | null>(null)
const courseData = ref<CourseAnalytics | null>(null)

/** 按需懒加载各 Tab 数据，避免一次性请求全部 */
async function loadTab(tab: string) {
  loading.value = true
  try {
    if (tab === 'members' && !memberData.value) {
      memberData.value = await request<MemberAnalytics>('/api/analytics/members')
    }
    else if (tab === 'teachers' && !teacherData.value) {
      teacherData.value = await request<TeacherAnalytics>('/api/analytics/teachers')
    }
    else if (tab === 'courses' && !courseData.value) {
      courseData.value = await request<CourseAnalytics>('/api/analytics/courses')
    }
  }
  catch { /* 已统一提示 */ }
  finally {
    loading.value = false
  }
}

watch(activeTab, loadTab)
onMounted(() => loadTab(activeTab.value))

/** 标签分布中最大计数（用于进度条归一化） */
const maxTagCount = computed(() =>
  Math.max(1, ...(memberData.value?.tags.map((t) => t.count) ?? [1])),
)
</script>

<template>
  <el-card shadow="never" v-loading="loading">
    <el-tabs v-model="activeTab">
      <!-- 会员分析 -->
      <el-tab-pane label="会员分析" name="members">
        <div class="analytics-grid">
          <div>
            <h3>上课频次 Top10（已完成预约）</h3>
            <el-table :data="memberData?.frequency ?? []" border size="small">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="name" label="会员" min-width="100" />
              <el-table-column label="分类" width="100">
                <template #default="{ row }">{{ MemberCategoryLabels[(row as MemberAnalytics['frequency'][number]).category] }}</template>
              </el-table-column>
              <el-table-column prop="completedCount" label="上课次数" width="90" />
            </el-table>
          </div>
          <div>
            <h3>课程偏好标签分布</h3>
            <div v-for="t in memberData?.tags ?? []" :key="t.tag" class="tag-row">
              <span class="tag-name">{{ t.tag }}</span>
              <el-progress :percentage="Math.round((t.count / maxTagCount) * 100)" :show-text="false" class="tag-bar" />
              <span class="tag-count">{{ t.count }}</span>
            </div>
            <el-empty v-if="!memberData?.tags?.length" description="暂无标签数据" :image-size="60" />
          </div>
        </div>
      </el-tab-pane>

      <!-- 教师分析 -->
      <el-tab-pane label="教师分析" name="teachers">
        <el-table :data="teacherData?.items ?? []" border>
          <el-table-column prop="name" label="教师" width="120" />
          <el-table-column prop="scheduleTotal" label="总排期数" width="100" />
          <el-table-column prop="scheduleFinished" label="已完成排期" width="110" />
          <el-table-column label="课程完成率" min-width="200">
            <template #default="{ row }">
              <el-progress :percentage="row.completionRate" :stroke-width="14" />
            </template>
          </el-table-column>
          <el-table-column prop="reviewCount" label="评价数" width="90" />
          <el-table-column label="平均评分" width="170">
            <template #default="{ row }">
              <el-rate v-if="row.avgRating != null" :model-value="row.avgRating" disabled show-score />
              <span v-else>暂无评价</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 课程分析 -->
      <el-tab-pane label="课程分析" name="courses">
        <el-table :data="courseData?.items ?? []" border>
          <el-table-column prop="name" label="课程" min-width="140" />
          <el-table-column prop="storeName" label="店铺" min-width="120" />
          <el-table-column prop="teacherName" label="教师" width="100" />
          <el-table-column prop="capacity" label="容纳人数" width="90" />
          <el-table-column prop="scheduleCount" label="排期场次" width="90" />
          <el-table-column prop="bookingCount" label="报名人数" width="90" />
          <el-table-column label="报名热度" min-width="180">
            <template #default="{ row }">
              <el-progress
                :percentage="Math.min(100, Math.round((row.bookingCount / Math.max(1, row.capacity * Math.max(1, row.scheduleCount))) * 100))"
                :stroke-width="14"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<style scoped>
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.analytics-grid h3 {
  font-size: 15px;
  margin: 0 0 12px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.tag-name {
  width: 90px;
  text-align: right;
  font-size: 13px;
  color: #595959;
}

.tag-bar {
  flex: 1;
}

.tag-count {
  width: 30px;
  font-size: 13px;
  color: #8c8c8c;
}
</style>
