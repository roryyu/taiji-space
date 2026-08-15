<!-- 课程预约：基于会员卡展示预约情况，支持批量设置排期 -->
<script setup lang="ts">
import { ElMessage } from 'element-plus'

/** 会员卡行数据（对应 /api/cards 响应） */
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
const filters = reactive({ keyword: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: CardRow[]; total: number }>('/api/cards', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
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
          date: startDate.toISOString().split('T')[0],
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
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
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
      <el-table-column label="有效期" min-width="180">
        <template #default="{ row }">{{ fmtDate(row.validFrom) }} ~ {{ fmtDate(row.validTo) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :disabled="row.scheduledCount >= row.totalBookable"
            @click="openScheduleDialog(row as CardRow)"
          >
            预约
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

      <el-table :data="scheduleItems" border v-loading="loadingSchedules">
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
  color: #909399;
}
</style>
