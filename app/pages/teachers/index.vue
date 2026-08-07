<!-- 教师管理：教师列表增删改查（姓名 / 资质 / 风格标签） -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 教师行数据（对应 /api/teachers 响应） */
interface TeacherRow {
  id: number
  name: string
  qualification: string
  styleTags: string[]
  status: keyof typeof TeacherStatusLabels
  _count: { courses: number; members: number }
}

const asRow = (row: unknown) => row as TeacherRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<TeacherRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', status: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: TeacherRow[]; total: number }>('/api/teachers', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
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

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  qualification: '',
  styleTags: [] as string[],
  status: 'ACTIVE' as string,
})

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', qualification: '', styleTags: [], status: 'ACTIVE' })
  dialogVisible.value = true
}

function openEdit(row: TeacherRow) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    qualification: row.qualification,
    styleTags: [...row.styleTags],
    status: row.status,
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name || !form.qualification) {
    ElMessage.warning('请填写姓名与资质')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await request(`/api/teachers/${editingId.value}`, { method: 'PUT', body: { ...form } })
      ElMessage.success('编辑成功')
    }
    else {
      await request('/api/teachers', { method: 'POST', body: { ...form } })
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

async function handleDelete(row: TeacherRow) {
  try {
    await ElMessageBox.confirm(`确认删除教师「${row.name}」？`, '提示', { type: 'warning' })
  }
  catch {
    return // 用户取消
  }
  try {
    await request(`/api/teachers/${row.id}`, { method: 'DELETE' })
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
      <el-input v-model="filters.keyword" placeholder="教师姓名" clearable class="w-200" @keyup.enter="handleSearch" />
      <el-select v-model="filters.status" placeholder="状态" clearable class="w-140">
        <el-option v-for="(label, key) in TeacherStatusLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增教师</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="qualification" label="资质" min-width="200" />
      <el-table-column label="风格标签" min-width="160">
        <template #default="{ row }">
          <el-tag v-for="tag in row.styleTags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
          <span v-if="!row.styleTags?.length">-</span>
        </template>
      </el-table-column>
      <el-table-column label="课程数" width="80">
        <template #default="{ row }">{{ row._count?.courses ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="学员数" width="80">
        <template #default="{ row }">{{ row._count?.members ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
            {{ TeacherStatusLabels[asRow(row).status] }}
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
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑教师' : '新增教师'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="资质" required>
          <el-input v-model="form.qualification" type="textarea" :rows="2" maxlength="200" placeholder="如：国家一级社会体育指导员" />
        </el-form-item>
        <el-form-item label="风格标签">
          <el-select v-model="form.styleTags" multiple filterable allow-create default-first-option placeholder="输入后回车创建标签" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button v-for="(label, key) in TeacherStatusLabels" :key="key" :value="key">{{ label }}</el-radio-button>
          </el-radio-group>
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
