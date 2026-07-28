<!-- 课程排期：增删改查（课程阶段 + 课程时段） -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 排期行数据（对应 /api/schedules 响应） */
interface ScheduleRow {
  id: number
  courseId: number
  stage: keyof typeof StageLabels
  startTime: string
  endTime: string
  status: keyof typeof ScheduleStatusLabels
  course: { id: number; name: string; capacity: number; teacher: { id: number; name: string } }
  _count: { bookings: number }
}

interface CourseOption { id: number; name: string; capacity: number }

const asRow = (row: unknown) => row as ScheduleRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<ScheduleRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ courseId: undefined as number | undefined, stage: '', status: '' })

const courses = ref<CourseOption[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: ScheduleRow[]; total: number }>('/api/schedules', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        courseId: filters.courseId || undefined,
        stage: filters.stage || undefined,
        status: filters.status || undefined,
      },
    })
    items.value = res.items
    total.value = res.total
  }
  finally {
    loading.value = false
  }
}

async function fetchOptions() {
  const res = await request<{ courses: CourseOption[] }>('/api/options')
  courses.value = res.courses
}

function handleSearch() {
  page.value = 1
  fetchList()
}

/** 时间格式化（YYYY-MM-DD HH:mm） */
function fmtTime(v: string) {
  return new Date(v).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  courseId: undefined as number | undefined,
  stage: 'BASIC' as string,
  range: [] as string[],
  status: 'OPEN' as string,
})

function openCreate() {
  editingId.value = null
  Object.assign(form, { courseId: undefined, stage: 'BASIC', range: [], status: 'OPEN' })
  dialogVisible.value = true
}

function openEdit(row: ScheduleRow) {
  editingId.value = row.id
  Object.assign(form, {
    courseId: row.courseId,
    stage: row.stage,
    range: [row.startTime, row.endTime],
    status: row.status,
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.courseId || form.range.length !== 2) {
    ElMessage.warning('请选择课程与课程时段')
    return
  }
  saving.value = true
  try {
    const body = {
      courseId: form.courseId,
      stage: form.stage,
      startTime: form.range[0],
      endTime: form.range[1],
      ...(editingId.value ? { status: form.status } : {}),
    }
    if (editingId.value) {
      await request(`/api/schedules/${editingId.value}`, { method: 'PUT', body })
      ElMessage.success('编辑成功')
    }
    else {
      await request('/api/schedules', { method: 'POST', body })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

async function handleDelete(row: ScheduleRow) {
  await ElMessageBox.confirm('确认删除该排期？', '提示', { type: 'warning' })
  await request(`/api/schedules/${row.id}`, { method: 'DELETE' })
  ElMessage.success('删除成功')
  fetchList()
}

onMounted(() => {
  fetchList()
  fetchOptions()
})
</script>

<template>
  <el-card shadow="never">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-select v-model="filters.courseId" placeholder="课程" clearable filterable class="w-180">
        <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="filters.stage" placeholder="课程阶段" clearable class="w-140">
        <el-option v-for="(label, key) in StageLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" clearable class="w-140">
        <el-option v-for="(label, key) in ScheduleStatusLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增排期</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="课程" min-width="140">
        <template #default="{ row }">{{ row.course?.name }}</template>
      </el-table-column>
      <el-table-column label="教师" width="100">
        <template #default="{ row }">{{ row.course?.teacher?.name }}</template>
      </el-table-column>
      <el-table-column label="课程阶段" width="90">
        <template #default="{ row }">
          <el-tag>{{ StageLabels[asRow(row).stage] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="课程时段" min-width="260">
        <template #default="{ row }">{{ fmtTime(row.startTime) }} ~ {{ fmtTime(row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="已约/容量" width="100">
        <template #default="{ row }">{{ row._count?.bookings ?? 0 }} / {{ row.course?.capacity }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'OPEN' ? 'success' : row.status === 'FINISHED' ? 'info' : 'danger'">
            {{ ScheduleStatusLabels[asRow(row).status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(asRow(row))">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(asRow(row))">删除</el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑排期' : '新增排期'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="课程" required>
          <el-select v-model="form.courseId" filterable placeholder="请选择课程">
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程阶段">
          <el-radio-group v-model="form.stage">
            <el-radio-button v-for="(label, key) in StageLabels" :key="key" :value="key">{{ label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="课程时段" required>
          <el-date-picker
            v-model="form.range"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
          />
        </el-form-item>
        <el-form-item v-if="editingId" label="状态">
          <el-select v-model="form.status">
            <el-option v-for="(label, key) in ScheduleStatusLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
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

.w-180 { width: 180px; }
.w-140 { width: 140px; }

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
