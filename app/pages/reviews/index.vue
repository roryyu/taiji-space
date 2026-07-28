<!-- 课程评价：查看 / 录入 / 删除 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 评价行数据（对应 /api/reviews 响应） */
interface ReviewRow {
  id: number
  memberId: number
  courseId: number
  rating: number
  suggestion: string | null
  createdAt: string
  member: { id: number; name: string }
  course: { id: number; name: string }
}

interface MemberOption { id: number; name: string; phone: string }
interface CourseOption { id: number; name: string }

const asRow = (row: unknown) => row as ReviewRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<ReviewRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ courseId: undefined as number | undefined, rating: undefined as number | undefined })

const members = ref<MemberOption[]>([])
const courses = ref<CourseOption[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: ReviewRow[]; total: number }>('/api/reviews', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        courseId: filters.courseId || undefined,
        rating: filters.rating || undefined,
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
  const res = await request<{ members: MemberOption[]; courses: CourseOption[] }>('/api/options')
  members.value = res.members
  courses.value = res.courses
}

function handleSearch() {
  page.value = 1
  fetchList()
}

// ---------- 录入评价 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({
  memberId: undefined as number | undefined,
  courseId: undefined as number | undefined,
  rating: 5,
  suggestion: '',
})

function openCreate() {
  Object.assign(form, { memberId: undefined, courseId: undefined, rating: 5, suggestion: '' })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.memberId || !form.courseId) {
    ElMessage.warning('请选择会员与课程')
    return
  }
  saving.value = true
  try {
    await request('/api/reviews', {
      method: 'POST',
      body: { ...form, suggestion: form.suggestion || null },
    })
    ElMessage.success('评价已录入')
    dialogVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

async function handleDelete(row: ReviewRow) {
  await ElMessageBox.confirm('确认删除该评价？', '提示', { type: 'warning' })
  await request(`/api/reviews/${row.id}`, { method: 'DELETE' })
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
      <el-select v-model="filters.rating" placeholder="评分" clearable class="w-120">
        <el-option v-for="n in 5" :key="n" :label="`${n} 星`" :value="n" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">录入评价</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="会员" width="120">
        <template #default="{ row }">{{ row.member?.name }}</template>
      </el-table-column>
      <el-table-column label="课程" min-width="140">
        <template #default="{ row }">{{ row.course?.name }}</template>
      </el-table-column>
      <el-table-column label="评分" width="170">
        <template #default="{ row }">
          <el-rate :model-value="row.rating" disabled />
        </template>
      </el-table-column>
      <el-table-column label="建议" min-width="200">
        <template #default="{ row }">{{ row.suggestion || '-' }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
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

    <!-- 录入评价对话框 -->
    <el-dialog v-model="dialogVisible" title="录入评价" width="480px">
      <el-form label-width="70px">
        <el-form-item label="会员" required>
          <el-select v-model="form.memberId" filterable placeholder="搜索会员">
            <el-option v-for="m in members" :key="m.id" :label="`${m.name}（${m.phone}）`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程" required>
          <el-select v-model="form.courseId" filterable placeholder="选择课程">
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分">
          <el-rate v-model="form.rating" />
        </el-form-item>
        <el-form-item label="建议">
          <el-input v-model="form.suggestion" type="textarea" :rows="3" maxlength="500" />
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
.w-120 { width: 120px; }

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
