<!-- 课程管理：课程创建（增删改查） -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 课程行数据（对应 /api/courses 响应） */
interface CourseRow {
  id: number
  name: string
  storeId: number
  teacherId: number
  capacity: number
  description: string | null
  store: { id: number; name: string }
  teacher: { id: number; name: string }
  _count: { schedules: number }
}

interface OptionItem { id: number; name: string }

const asRow = (row: unknown) => row as CourseRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<CourseRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', storeId: undefined as number | undefined, teacherId: undefined as number | undefined })

const stores = ref<OptionItem[]>([])
const teachers = ref<OptionItem[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: CourseRow[]; total: number }>('/api/courses', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        storeId: filters.storeId || undefined,
        teacherId: filters.teacherId || undefined,
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

async function fetchOptions() {
  try {
    const res = await request<{ stores: OptionItem[]; teachers: OptionItem[] }>('/api/options')
    stores.value = res.stores
    teachers.value = res.teachers
  }
  catch { /* 已统一提示 */ }
}

function handleSearch() {
  page.value = 1
  fetchList()
}

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  storeId: undefined as number | undefined,
  teacherId: undefined as number | undefined,
  capacity: 10,
  description: '',
})

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', storeId: undefined, teacherId: undefined, capacity: 10, description: '' })
  dialogVisible.value = true
}

function openEdit(row: CourseRow) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    storeId: row.storeId,
    teacherId: row.teacherId,
    capacity: row.capacity,
    description: row.description ?? '',
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name || !form.storeId || !form.teacherId) {
    ElMessage.warning('请填写课程名称并选择店铺、教师')
    return
  }
  saving.value = true
  try {
    const body = { ...form, description: form.description || null }
    if (editingId.value) {
      await request(`/api/courses/${editingId.value}`, { method: 'PUT', body })
      ElMessage.success('编辑成功')
    }
    else {
      await request('/api/courses', { method: 'POST', body })
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

async function handleDelete(row: CourseRow) {
  try {
    await ElMessageBox.confirm(`确认删除课程「${row.name}」？`, '提示', { type: 'warning' })
  }
  catch {
    return // 用户取消
  }
  try {
    await request(`/api/courses/${row.id}`, { method: 'DELETE' })
    ElMessage.success('删除成功')
    fetchList()
  }
  catch { /* 已统一提示 */ }
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
      <el-input v-model="filters.keyword" placeholder="课程名称" clearable class="w-200" @keyup.enter="handleSearch" />
      <el-select v-model="filters.storeId" placeholder="课程店铺" clearable class="w-140">
        <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-select v-model="filters.teacherId" placeholder="教师" clearable class="w-140">
        <el-option v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增课程</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="课程名称" min-width="140" />
      <el-table-column label="课程店铺" min-width="120">
        <template #default="{ row }">{{ row.store?.name }}</template>
      </el-table-column>
      <el-table-column label="教师" width="100">
        <template #default="{ row }">{{ row.teacher?.name }}</template>
      </el-table-column>
      <el-table-column prop="capacity" label="容纳人数" width="90" />
      <el-table-column label="课程描述" min-width="180">
        <template #default="{ row }">{{ row.description || '-' }}</template>
      </el-table-column>
      <el-table-column label="排期数" width="80">
        <template #default="{ row }">{{ row._count?.schedules ?? 0 }}</template>
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
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑课程' : '新增课程'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="课程名称" required>
          <el-input v-model="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="课程店铺" required>
          <el-select v-model="form.storeId" placeholder="请选择店铺">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="教师" required>
          <el-select v-model="form.teacherId" placeholder="请选择教师">
            <el-option v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="容纳人数">
          <el-input-number v-model="form.capacity" :min="1" :max="200" />
        </el-form-item>
        <el-form-item label="课程描述">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" />
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

.w-200 { width: 200px; }
.w-140 { width: 140px; }

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
