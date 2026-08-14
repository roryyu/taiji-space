<!-- 会员信息管理：增删改查 + 批量导入 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 会员行数据结构（对应 /api/members 响应） */
interface MemberRow {
  id: number
  name: string
  phone: string
  channel: keyof typeof ChannelLabels
  preferenceTags: string[]
  remark: string | null
}

/** el-table 插槽 row 为弱类型，统一收窄为 MemberRow */
const asRow = (row: unknown) => row as MemberRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<MemberRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', channel: '' })

/** 拉取列表 */
async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: MemberRow[]; total: number }>('/api/members', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        channel: filters.channel || undefined,
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
  phone: '',
  channel: 'WALK_IN' as string,
  preferenceTags: [] as string[],
  remark: '',
})

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    name: '', phone: '',
    channel: 'WALK_IN', preferenceTags: [], remark: '',
  })
  dialogVisible.value = true
}

function openEdit(row: MemberRow) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    phone: row.phone,
    channel: row.channel,
    preferenceTags: [...row.preferenceTags],
    remark: row.remark ?? '',
  })
  dialogVisible.value = true
}

/** 保存（新增或编辑） */
async function handleSave() {
  if (!form.name || !form.phone) {
    ElMessage.warning('请填写姓名和手机号')
    return
  }
  saving.value = true
  try {
    const body = { ...form, remark: form.remark || null }
    if (editingId.value) {
      await request(`/api/members/${editingId.value}`, { method: 'PUT', body })
      ElMessage.success('编辑成功')
    }
    else {
      await request('/api/members', { method: 'POST', body })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchList()
  }
  catch { /* 错误已由 useApi 统一提示 */ }
  finally {
    saving.value = false
  }
}

/** 删除会员 */
async function handleDelete(row: MemberRow) {
  try {
    await ElMessageBox.confirm(`确认删除会员「${row.name}」？`, '提示', { type: 'warning' })
  }
  catch {
    return // 用户取消
  }
  try {
    await request(`/api/members/${row.id}`, { method: 'DELETE' })
    ElMessage.success('删除成功')
    fetchList()
  }
  catch { /* 已统一提示 */ }
}

// ---------- 批量导入 ----------
const importVisible = ref(false)
const importText = ref('')
const importing = ref(false)

/** 导入结果（对应 /api/members/import 响应） */
interface ImportResult {
  total: number
  successCount: number
  failCount: number
  results: { line: number; name: string; success: boolean; message: string }[]
}
const importResult = ref<ImportResult | null>(null)

/** 打开导入对话框 */
function openImport() {
  importVisible.value = true
  importText.value = ''
  importResult.value = null
}

/** 提交批量导入（CSV 文本：姓名,手机号,渠道） */
async function handleImport() {
  if (!importText.value.trim()) {
    ElMessage.warning('请粘贴导入数据')
    return
  }
  importing.value = true
  try {
    importResult.value = await request<ImportResult>('/api/members/import', {
      method: 'POST',
      body: { csv: importText.value },
    })
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    importing.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<template>
  <el-card shadow="never">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-input v-model="filters.keyword" placeholder="姓名 / 手机号" clearable class="w-200" @keyup.enter="handleSearch" />
      <el-select v-model="filters.channel" placeholder="获客渠道" clearable class="w-140">
        <el-option v-for="(label, key) in ChannelLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button @click="openImport">批量导入</el-button>
      <el-button type="primary" @click="openCreate">新增会员</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="顾客姓名" min-width="100" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="获客渠道" width="100">
        <template #default="{ row }">{{ ChannelLabels[asRow(row).channel] }}</template>
      </el-table-column>
      <el-table-column label="课程偏好" min-width="150">
        <template #default="{ row }">
          <el-tag v-for="tag in row.preferenceTags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
          <span v-if="!row.preferenceTags?.length">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120">
        <template #default="{ row }">{{ row.remark || '-' }}</template>
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
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑会员' : '新增会员'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="顾客姓名" required>
          <el-input v-model="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="获客渠道">
          <el-select v-model="form.channel">
            <el-option v-for="(label, key) in ChannelLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程偏好">
          <el-select v-model="form.preferenceTags" multiple filterable allow-create default-first-option placeholder="输入后回车创建标签" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="importVisible" title="批量导入会员" width="560px">
      <el-alert type="info" :closable="false" class="import-tip">
        <p>每行一条记录，逗号分隔：姓名,手机号,渠道</p>
        <p>示例：张三,13800001234,转介绍（渠道可留空取默认值）</p>
      </el-alert>
      <el-input v-model="importText" type="textarea" :rows="8" placeholder="张三,13800001234,转介绍" />
      <div v-if="importResult" class="import-result">
        <p>共 {{ importResult.total }} 条，成功 {{ importResult.successCount }} 条，失败 {{ importResult.failCount }} 条</p>
        <ul class="import-errors">
          <li v-for="r in importResult.results.filter((x) => !x.success)" :key="r.line">
            第 {{ r.line }} 行：{{ r.message }}
          </li>
        </ul>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">导入</el-button>
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

.import-tip {
  margin-bottom: 12px;
}

.import-tip p {
  margin: 0;
  font-size: 12px;
}

.import-result {
  margin-top: 12px;
  font-size: 13px;
}

.import-errors {
  color: #f56c6c;
  max-height: 120px;
  overflow-y: auto;
  padding-left: 18px;
}
</style>
