<!-- 课程预约：查看 / 预约 / 取消 / 核销完成 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 预约行数据（对应 /api/bookings 响应） */
interface BookingRow {
  id: number
  memberId: number
  scheduleId: number
  status: keyof typeof BookingStatusLabels
  createdAt: string
  member: { id: number; name: string; phone: string }
  schedule: {
    id: number
    stage: keyof typeof StageLabels
    startTime: string
    endTime: string
    course: { id: number; name: string }
  }
}

interface MemberOption { id: number; name: string; phone: string }

/** 可选排期（预约时选择） */
interface ScheduleOption {
  id: number
  stage: keyof typeof StageLabels
  startTime: string
  endTime: string
  status: string
  course: { id: number; name: string; capacity: number }
  _count: { bookings: number }
}

const asRow = (row: unknown) => row as BookingRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<BookingRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ status: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: BookingRow[]; total: number }>('/api/bookings', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        status: filters.status || undefined,
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
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ---------- 新增预约 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const members = ref<MemberOption[]>([])
const openSchedules = ref<ScheduleOption[]>([])
const form = reactive({ memberId: undefined as number | undefined, scheduleId: undefined as number | undefined })

// ---------- 会员远程搜索 ----------
const memberLoading = ref(false)

/** 加载会员选项（keyword 为空返回默认列表，否则按姓名/手机号模糊匹配） */
async function loadMemberOptions(keyword = '') {
  memberLoading.value = true
  try {
    const res = await request<{ members: MemberOption[] }>('/api/options', {
      query: keyword ? { memberKeyword: keyword } : {},
    })
    members.value = res.members
  }
  catch { /* 已统一提示 */ }
  finally {
    memberLoading.value = false
  }
}

function searchMembers(keyword: string) {
  loadMemberOptions(keyword)
}

async function openCreate() {
  Object.assign(form, { memberId: undefined, scheduleId: undefined })
  dialogVisible.value = true
  // 会员选项 + 开放预约的排期并行加载
  try {
    const [, schedules] = await Promise.all([
      loadMemberOptions(),
      request<{ items: ScheduleOption[] }>('/api/schedules', { query: { status: 'OPEN', pageSize: 100 } }),
    ])
    openSchedules.value = schedules.items
  }
  catch { /* 已统一提示 */ }
}

/** 排期展示文案：课程 / 阶段 / 时间 / 余位 */
function scheduleLabel(s: ScheduleOption) {
  const left = s.course.capacity - s._count.bookings
  return `${s.course.name}（${StageLabels[s.stage]}）${fmtTime(s.startTime)} 余${left}位`
}

async function handleCreate() {
  if (!form.memberId || !form.scheduleId) {
    ElMessage.warning('请选择会员与课程排期')
    return
  }
  saving.value = true
  try {
    await request('/api/bookings', { method: 'POST', body: { ...form } })
    ElMessage.success('预约成功')
    dialogVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

// ---------- 取消 / 完成 ----------
async function handleCancel(row: BookingRow) {
  try {
    await ElMessageBox.confirm(`确认取消「${row.member.name}」的预约？`, '提示', { type: 'warning' })
  }
  catch {
    return // 用户取消
  }
  try {
    await request(`/api/bookings/${row.id}/cancel`, { method: 'POST' })
    ElMessage.success('已取消')
    fetchList()
  }
  catch { /* 已统一提示 */ }
}

async function handleComplete(row: BookingRow) {
  try {
    await request(`/api/bookings/${row.id}/complete`, { method: 'POST' })
    ElMessage.success('已完成核销')
    fetchList()
  }
  catch { /* 已统一提示 */ }
}

onMounted(fetchList)
</script>

<template>
  <el-card shadow="never">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-select v-model="filters.status" placeholder="预约状态" clearable class="w-140">
        <el-option v-for="(label, key) in BookingStatusLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增预约</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="会员" min-width="140">
        <template #default="{ row }">{{ row.member?.name }}（{{ row.member?.phone }}）</template>
      </el-table-column>
      <el-table-column label="课程" min-width="130">
        <template #default="{ row }">{{ row.schedule?.course?.name }}</template>
      </el-table-column>
      <el-table-column label="课程阶段" width="90">
        <template #default="{ row }">
          <el-tag>{{ StageLabels[asRow(row).schedule.stage] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="课程时间" min-width="260">
        <template #default="{ row }">{{ fmtTime(row.schedule?.startTime) }} ~ {{ fmtTime(row.schedule?.endTime) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'BOOKED' ? 'success' : row.status === 'COMPLETED' ? 'info' : 'danger'">
            {{ BookingStatusLabels[asRow(row).status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'BOOKED'">
            <el-button link type="success" @click="handleComplete(asRow(row))">完成</el-button>
            <el-button link type="danger" @click="handleCancel(asRow(row))">取消预约</el-button>
          </template>
          <span v-else>-</span>
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

    <!-- 新增预约对话框 -->
    <el-dialog v-model="dialogVisible" title="新增预约" width="560px">
      <el-form label-width="90px">
        <el-form-item label="会员" required>
          <el-select
            v-model="form.memberId"
            filterable
            remote
            reserve-keyword
            :remote-method="searchMembers"
            :loading="memberLoading"
            placeholder="按姓名/手机号搜索"
          >
            <el-option v-for="m in members" :key="m.id" :label="`${m.name}（${m.phone}）`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程排期" required>
          <el-select v-model="form.scheduleId" filterable placeholder="选择开放预约的排期">
            <el-option v-for="s in openSchedules" :key="s.id" :label="scheduleLabel(s)" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">确认预约</el-button>
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

.spacer {
  flex: 1;
}

.w-140 { width: 140px; }

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
