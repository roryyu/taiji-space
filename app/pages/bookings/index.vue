<!-- 课程预约：基于会员卡展示预约情况，支持批量设置排期 -->
<script setup lang="ts">
import { ElMessage } from 'element-plus'


interface CardRow {
  id: number
  cardNo: string
  memberId: number
  storeId: number
  courseId: number
  coachId: number
  staffId: number | null
  totalAmount: number
  totalSessions: number
  giftSessions: number
  validFrom: string
  validTo: string
  createdAt: string
  updatedAt: string
  member: { id: number; name: string; phone: string }
  store: { id: number; name: string }
  course: { id: number; name: string }
  coach: { id: number; name: string }
  creator: { id: number; name: string } | null
  _count: { schedules: number }
  totalBookable: number
  scheduledCount: number
  bookingInfo: string
  completedCount: number
  totalCourseCount: number
  courseUsageInfo: string
  recentMonthCompleted: number
  lastCompletedTime: string | null
  lastFeedbackTime: string | null
}

/** 排期项 */
interface ScheduleItem {
  id?: number // 已有排期的id，新增时为空
  date: string // 日期 YYYY-MM-DD
  startTime: string // 开始时间 HH:mm
  endTime: string // 结束时间 HH:mm
  status?: 'PENDING' | 'COMPLETED' // 排期状态
}

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<CardRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', ops: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: CardRow[]; total: number }>('/api/cards', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        opsFilter: filters.ops || undefined,
      },
    })
    items.value = res.items
    total.value = res.total
  }
  catch { /* 已统一提示 */ }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchList()
}

function fmtTime(v: string) {
  return new Date(v).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

/** 运营标识：耗课未完成时按近一个月已上课次数分级（0次红灯 / 1次橙灯 / ≥2次绿灯） */
function opsFlag(recentMonthCompleted: number) {
  if (recentMonthCompleted === 0) {
    return { label: '红灯', color: '#F56C6C' }
  }
  if (recentMonthCompleted === 1) {
    return { label: '橙灯', color: '#E6A23C' }
  }
  return { label: '绿灯', color: '#67C23A' }
}

/** 是否红灯客户：耗课未完成且近一个月 0 次上课 */
function isRedLight(row: CardRow): boolean {
  return row.completedCount < row.totalCourseCount && row.recentMonthCompleted === 0
}

/** 红灯客户且最近一周无沟通反馈（含从未沟通） */
function isFeedbackOverdue(row: CardRow): boolean {
  if (!isRedLight(row)) return false
  if (!row.lastFeedbackTime) return true
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return new Date(row.lastFeedbackTime).getTime() < oneWeekAgo
}

// ---------- 沟通反馈（红灯客户跟进） ----------
interface FeedbackItem {
  id: number
  content: string | null
  createdAt: string
  coach: { id: number; name: string }
}

const feedbackVisible = ref(false)
const feedbackCard = ref<CardRow | null>(null)
const feedbackItems = ref<FeedbackItem[]>([])
const loadingFeedback = ref(false)
const feedbackContent = ref('')
const feedbackSaving = ref(false)

/** 拉取某会员的历史沟通反馈 */
async function fetchFeedbacks(memberId: number) {
  loadingFeedback.value = true
  try {
    const res = await request<{ items: FeedbackItem[] }>('/api/feedbacks', {
      query: { memberId, pageSize: 50 },
    })
    feedbackItems.value = res.items
  }
  catch {
    feedbackItems.value = []
  }
  finally {
    loadingFeedback.value = false
  }
}

function openFeedbackDialog(card: CardRow) {
  feedbackCard.value = card
  feedbackContent.value = ''
  feedbackVisible.value = true
  fetchFeedbacks(card.memberId)
}

/** 保存沟通内容（预约上课？为什么不来上课？近况等） */
async function handleSaveFeedback() {
  if (!feedbackCard.value) return
  if (!feedbackContent.value.trim()) {
    ElMessage.warning('请填写沟通内容')
    return
  }
  feedbackSaving.value = true
  try {
    await request('/api/feedbacks', {
      method: 'POST',
      body: {
        memberId: feedbackCard.value.memberId,
        storeId: feedbackCard.value.storeId,
        courseId: feedbackCard.value.courseId,
        coachId: feedbackCard.value.coachId,
        content: feedbackContent.value,
      },
    })
    ElMessage.success('沟通反馈已保存')
    feedbackContent.value = ''
    fetchFeedbacks(feedbackCard.value.memberId)
    fetchList() // 刷新列表「最近沟通时间」列
  }
  catch { /* 已统一提示 */ }
  finally {
    feedbackSaving.value = false
  }
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

// ---------- 预约排期 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const currentCard = ref<CardRow | null>(null)
const scheduleItems = ref<ScheduleItem[]>([])
const loadingSchedules = ref(false)

async function openScheduleDialog(card: CardRow) {
  currentCard.value = card
  loadingSchedules.value = true
  dialogVisible.value = true

  try {
    // 加载该会员卡已有的排期数据
    const res = await request<{ items: { id: number; startTime: string; endTime: string; status: string }[] }>('/api/schedules', {
      query: { cardId: card.id, pageSize: 100 },
    })

    if (res.items.length > 0) {
      // 将已有的排期数据转换为表单格式
      scheduleItems.value = res.items.map((item) => {
        const startDate = new Date(item.startTime)
        const endDate = new Date(item.endTime)
        return {
          id: item.id,
          date: startDate.toISOString().slice(0, 10),
          startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
          endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
          status: item.status as 'PENDING' | 'COMPLETED',
        }
      })
    } else {
      // 没有已有排期，预填充一个空行
      scheduleItems.value = [{ date: '', startTime: '', endTime: '' }]
    }
  }
  catch {
    // 加载失败时预填充一个空行
    scheduleItems.value = [{ date: '', startTime: '', endTime: '' }]
  }
  finally {
    loadingSchedules.value = false
  }
}

function addScheduleItem() {
  if (!currentCard.value) return
  const maxItems = currentCard.value.totalBookable
  if (scheduleItems.value.length >= maxItems) {
    ElMessage.warning(`最多只能设置${maxItems}个排期`)
    return
  }
  scheduleItems.value.push({ date: '', startTime: '', endTime: '', status: 'PENDING' })
}

function removeScheduleItem(index: number) {
  scheduleItems.value.splice(index, 1)
}

async function handleSaveSchedules() {
  if (!currentCard.value) return

  // 过滤出完整的排期项（只保留未上课的排期和新增的排期）
  const validSchedules = scheduleItems.value
    .filter((item) => item.date && item.startTime && item.endTime && item.status !== 'COMPLETED')
    .map((item) => {
      // 将日期和时间组合成 ISO 字符串
      const startDateTime = `${item.date}T${item.startTime}:00`
      const endDateTime = `${item.date}T${item.endTime}:00`
      return {
        id: item.id,
        startTime: startDateTime,
        endTime: endDateTime,
      }
    })

  // 验证时间格式
  for (const schedule of validSchedules) {
    if (new Date(schedule.startTime) >= new Date(schedule.endTime)) {
      ElMessage.warning('排期开始时间必须早于结束时间')
      return
    }
  }

  saving.value = true
  try {
    await request('/api/schedules/batch', {
      method: 'POST',
      body: {
        cardId: currentCard.value.id,
        memberId: currentCard.value.memberId,
        courseId: currentCard.value.courseId,
        schedules: validSchedules,
      },
    })
    ElMessage.success('排期设置成功')
    dialogVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <el-card shadow="never">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="卡号/会员姓名/手机号"
        clearable
        class="w-200"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <!-- 运营状态快捷筛选 -->
      <el-radio-group v-model="filters.ops" class="ops-filter" @change="handleSearch">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="RED">运营红灯</el-radio-button>
        <el-radio-button value="RED_NO_FEEDBACK">运营红灯未反馈</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items">
      <el-table-column prop="cardNo" label="会员卡" min-width="120" />
      <el-table-column label="会员姓名" min-width="100">
        <template #default="{ row }">{{ row.member?.name }}</template>
      </el-table-column>
      <el-table-column label="课程" min-width="100">
        <template #default="{ row }">{{ row.course?.name }}</template>
      </el-table-column>
      <el-table-column label="授课教师" min-width="100">
        <template #default="{ row }">{{ row.coach?.name }}</template>
      </el-table-column>
      <el-table-column label="预约情况" min-width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.scheduledCount >= row.totalBookable ? 'danger' : 'success'">
            {{ row.bookingInfo }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="耗课情况" min-width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.completedCount >= row.totalCourseCount ? 'success' : 'warning'">
            {{ row.courseUsageInfo }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近上课时间" min-width="160" align="center">
        <template #default="{ row }">
          {{ row.lastCompletedTime ? fmtTime(row.lastCompletedTime) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="运营标识" min-width="100" align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.completedCount < row.totalCourseCount"
            :content="`${opsFlag(row.recentMonthCompleted).label}（近一个月已上课 ${row.recentMonthCompleted} 次）`"
            placement="top"
          >
            <!-- 自定义信号灯 SVG：外圈光晕 + 主体圆 + 高光点 -->
            <svg width="20" height="20" viewBox="0 0 20 20" class="ops-light">
              <circle cx="10" cy="10" r="9" :fill="opsFlag(row.recentMonthCompleted).color" opacity="0.25" />
              <circle cx="10" cy="10" r="6" :fill="opsFlag(row.recentMonthCompleted).color" />
              <circle cx="8" cy="8" r="1.8" fill="#FFFFFF" opacity="0.55" />
            </svg>
          </el-tooltip>
          <span v-else class="text-gray-500">-</span>
        </template>
      </el-table-column>
      <el-table-column label="最近沟通时间" min-width="160" align="center">
        <template #default="{ row }">
          <div class="feedback-cell">
            <span>{{ row.lastFeedbackTime ? fmtTime(row.lastFeedbackTime) : '-' }}</span>
            <!-- 红灯客户且一周无沟通反馈：提示红灯 -->
            <el-tooltip v-if="isFeedbackOverdue(row as CardRow)" content="红灯客户且最近一周无沟通反馈" placement="top">
              <svg width="16" height="16" viewBox="0 0 20 20" class="ops-light">
                <circle cx="10" cy="10" r="9" fill="#F56C6C" opacity="0.25" />
                <circle cx="10" cy="10" r="6" fill="#F56C6C" />
                <circle cx="8" cy="8" r="1.8" fill="#FFFFFF" opacity="0.55" />
              </svg>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="有效期" min-width="180">
        <template #default="{ row }">{{ fmtDate(row.validFrom) }} ~ {{ fmtDate(row.validTo) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :disabled="row.scheduledCount >= row.totalBookable"
            @click="openScheduleDialog(row as CardRow)"
          >
            预约
          </el-button>
          <!-- 红灯客户：记录与客户的沟通内容 -->
          <el-button
            v-if="isRedLight(row as CardRow)"
            link
            type="danger"
            @click="openFeedbackDialog(row as CardRow)"
          >
            沟通反馈
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="pagination"
      @change="fetchList"
    />

    <!-- 预约排期对话框 -->
    <el-dialog v-model="dialogVisible" title="设置课程排期" width="800px">
      <div v-if="currentCard" class="mb-4">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="会员卡">{{ currentCard.cardNo }}</el-descriptions-item>
          <el-descriptions-item label="会员">{{ currentCard.member?.name }}</el-descriptions-item>
          <el-descriptions-item label="课程">{{ currentCard.course?.name }}</el-descriptions-item>
          <el-descriptions-item label="可预约次数">{{ currentCard.totalBookable }}次</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="mb-4">
        <el-button type="primary" @click="addScheduleItem" :disabled="loadingSchedules">添加排期</el-button>
        <span class="ml-2 text-gray-500">已设置 {{ scheduleItems.filter(item => item.date && item.startTime && item.endTime).length }} 个排期</span>
      </div>

      <el-table :data="scheduleItems" v-loading="loadingSchedules">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'COMPLETED' ? 'success' : 'info'" size="small">
              {{ row.status === 'COMPLETED' ? '已上课' : '未上课' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="日期" min-width="150">
          <template #default="{ row }">
            <el-date-picker
              v-model="row.date"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabled="row.status === 'COMPLETED'"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="开始时间" min-width="120">
          <template #default="{ row }">
            <el-time-picker
              v-model="row.startTime"
              placeholder="开始时分"
              format="HH:mm"
              value-format="HH:mm"
              :disabled="row.status === 'COMPLETED'"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="结束时间" min-width="120">
          <template #default="{ row }">
            <el-time-picker
              v-model="row.endTime"
              placeholder="结束时分"
              format="HH:mm"
              value-format="HH:mm"
              :disabled="row.status === 'COMPLETED'"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row, $index }">
            <el-button
              link
              type="danger"
              :disabled="row.status === 'COMPLETED'"
              @click="removeScheduleItem($index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveSchedules">保存</el-button>
      </template>
    </el-dialog>

    <!-- 沟通反馈对话框（红灯客户） -->
    <el-dialog v-model="feedbackVisible" title="沟通反馈" width="640px">
      <div v-if="feedbackCard" class="mb-4">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="会员">{{ feedbackCard.member?.name }}</el-descriptions-item>
          <el-descriptions-item label="会员卡">{{ feedbackCard.cardNo }}</el-descriptions-item>
          <el-descriptions-item label="课程">{{ feedbackCard.course?.name }}</el-descriptions-item>
          <el-descriptions-item label="授课教师">{{ feedbackCard.coach?.name }}</el-descriptions-item>
        </el-descriptions>
        <p class="feedback-tip">记录与客户的沟通内容：预约上课？为什么不来上课？近况等。</p>
      </div>

      <el-input
        v-model="feedbackContent"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        placeholder="如：已电话沟通，客户近期出差，预计下周回店预约上课"
      />
      <div class="feedback-actions">
        <el-button type="primary" :loading="feedbackSaving" @click="handleSaveFeedback">保存本次沟通</el-button>
      </div>

      <!-- 历史沟通记录 -->
      <div class="feedback-history">
        <h4>历史沟通记录</h4>
        <div v-loading="loadingFeedback">
          <div v-if="feedbackItems.length" class="feedback-list">
            <div v-for="item in feedbackItems" :key="item.id" class="feedback-item">
              <div class="feedback-meta">
                <span class="feedback-time">{{ fmtTime(item.createdAt) }}</span>
                <span>记录人：{{ item.coach?.name }}</span>
              </div>
              <p class="feedback-content">{{ item.content || '-' }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无沟通记录" :image-size="60" />
        </div>
      </div>

      <template #footer>
        <el-button @click="feedbackVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.w-200 { width: 200px; }

.ops-filter {
  margin-left: 8px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.mb-4 {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.text-gray-500 {
  color: var(--ts-muted-foreground);
}

.feedback-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ops-light {
  display: inline-block;
  vertical-align: middle;
}

.feedback-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ts-muted-foreground);
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.feedback-history {
  margin-top: 20px;
}

.feedback-history h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--ts-foreground);
  margin-bottom: 12px;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
}

.feedback-item {
  padding: 12px;
  background: var(--ts-muted);
  border: 1px solid var(--ts-border);
  border-radius: var(--radius-md);
}

.feedback-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--ts-muted-foreground);
  margin-bottom: 4px;
}

.feedback-content {
  font-size: 13.5px;
  color: var(--ts-foreground);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
