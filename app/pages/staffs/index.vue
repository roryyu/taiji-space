<!-- 员工管理：员工列表增删改查（姓名 / 资质 / 风格标签） -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 员工行数据（对应 /api/staffs 响应） */
interface StaffRow {
  id: number
  name: string
  account: string
  type: keyof typeof StaffTypeLabels
  qualification: string | null
  styleTags: string[]
}

const asRow = (row: unknown) => row as StaffRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<StaffRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', type: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: StaffRow[]; total: number }>('/api/staffs', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        type: filters.type || undefined,
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

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  account: '',
  password: '',
  type: 'TEACHER' as string,
  qualification: '',
  styleTags: [] as string[],
})

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', account: '', password: '', type: 'TEACHER', qualification: '', styleTags: [] })
  dialogVisible.value = true
}

function openEdit(row: StaffRow) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    account: row.account,
    password: '',
    type: row.type,
    qualification: row.qualification ?? '',
    styleTags: [...row.styleTags],
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name || !form.account) {
    ElMessage.warning('请填写姓名与账号')
    return
  }
  if (!editingId.value && !form.password) {
    ElMessage.warning('新增员工必须填写密码')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await request(`/api/staffs/${editingId.value}`, { method: 'PUT', body: { ...form, password: form.password || undefined } })
      ElMessage.success('编辑成功')
    }
    else {
      await request('/api/staffs', { method: 'POST', body: { ...form } })
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

async function handleDelete(row: StaffRow) {
  try {
    await ElMessageBox.confirm(`确认删除员工「${row.name}」？`, '提示', { type: 'warning' })
  }
  catch {
    return // 用户取消
  }
  try {
    await request(`/api/staffs/${row.id}`, { method: 'DELETE' })
    ElMessage.success('删除成功')
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
      <el-input v-model="filters.keyword" placeholder="员工姓名" clearable class="w-200" @keyup.enter="handleSearch" />
      <el-select v-model="filters.type" placeholder="类型" clearable class="w-140">
        <el-option v-for="(label, key) in StaffTypeLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增员工</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="account" label="账号" width="140" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ StaffTypeLabels[asRow(row).type] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="qualification" label="资质" min-width="200">
        <template #default="{ row }">{{ row.qualification ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="风格标签" min-width="160">
        <template #default="{ row }">
          <el-tag v-for="tag in row.styleTags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
          <span v-if="!row.styleTags?.length">-</span>
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
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑员工' : '新增员工'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="账号" required>
          <el-input v-model="form.account" maxlength="50" />
        </el-form-item>
        <el-form-item label="密码" :required="!editingId">
          <el-input v-model="form.password" type="password" show-password :placeholder="editingId ? '留空则不修改密码' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.type">
            <el-option v-for="(label, key) in StaffTypeLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="资质">
          <el-input v-model="form.qualification" type="textarea" :rows="2" maxlength="200" placeholder="如：国家一级社会体育指导员（选填）" />
        </el-form-item>
        <el-form-item label="风格标签">
          <el-select v-model="form.styleTags" multiple filterable allow-create default-first-option placeholder="输入后回车创建标签" />
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

.tag-item {
  margin-right: 4px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
