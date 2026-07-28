<!-- 系统配置：店铺管理 + 系统参数 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 店铺行数据（对应 /api/stores 响应） */
interface StoreRow {
  id: number
  name: string
  address: string
  businessHours: string
  _count: { members: number; courses: number }
}

/** 系统参数行数据 */
interface ParamRow {
  key: string
  value: string
  description: string | null
}

const asStore = (row: unknown) => row as StoreRow
const asParam = (row: unknown) => row as ParamRow

const { request } = useApi()

const activeTab = ref('stores')

// ---------- 店铺管理 ----------
const storeLoading = ref(false)
const stores = ref<StoreRow[]>([])
const storeTotal = ref(0)
const storePage = ref(1)
const storePageSize = ref(10)

async function fetchStores() {
  storeLoading.value = true
  try {
    const res = await request<{ items: StoreRow[]; total: number }>('/api/stores', {
      query: { page: storePage.value, pageSize: storePageSize.value },
    })
    stores.value = res.items
    storeTotal.value = res.total
  }
  finally {
    storeLoading.value = false
  }
}

const storeDialogVisible = ref(false)
const storeSaving = ref(false)
const editingStoreId = ref<number | null>(null)
const storeForm = reactive({ name: '', address: '', businessHours: '09:00-21:00' })

function openStoreCreate() {
  editingStoreId.value = null
  Object.assign(storeForm, { name: '', address: '', businessHours: '09:00-21:00' })
  storeDialogVisible.value = true
}

function openStoreEdit(row: StoreRow) {
  editingStoreId.value = row.id
  Object.assign(storeForm, { name: row.name, address: row.address, businessHours: row.businessHours })
  storeDialogVisible.value = true
}

async function handleStoreSave() {
  if (!storeForm.name || !storeForm.address || !storeForm.businessHours) {
    ElMessage.warning('请填写店铺名称、地址与经营时段')
    return
  }
  storeSaving.value = true
  try {
    if (editingStoreId.value) {
      await request(`/api/stores/${editingStoreId.value}`, { method: 'PUT', body: { ...storeForm } })
      ElMessage.success('编辑成功')
    }
    else {
      await request('/api/stores', { method: 'POST', body: { ...storeForm } })
      ElMessage.success('新增成功')
    }
    storeDialogVisible.value = false
    fetchStores()
  }
  catch { /* 已统一提示 */ }
  finally {
    storeSaving.value = false
  }
}

async function handleStoreDelete(row: StoreRow) {
  await ElMessageBox.confirm(`确认删除店铺「${row.name}」？`, '提示', { type: 'warning' })
  await request(`/api/stores/${row.id}`, { method: 'DELETE' })
  ElMessage.success('删除成功')
  fetchStores()
}

// ---------- 系统参数 ----------
const paramLoading = ref(false)
const params = ref<ParamRow[]>([])

async function fetchParams() {
  paramLoading.value = true
  try {
    const res = await request<{ items: ParamRow[] }>('/api/params')
    params.value = res.items
  }
  finally {
    paramLoading.value = false
  }
}

const paramDialogVisible = ref(false)
const paramSaving = ref(false)
const editingParamKey = ref<string | null>(null)
const paramForm = reactive({ key: '', value: '', description: '' })

function openParamCreate() {
  editingParamKey.value = null
  Object.assign(paramForm, { key: '', value: '', description: '' })
  paramDialogVisible.value = true
}

function openParamEdit(row: ParamRow) {
  editingParamKey.value = row.key
  Object.assign(paramForm, { key: row.key, value: row.value, description: row.description ?? '' })
  paramDialogVisible.value = true
}

async function handleParamSave() {
  if (!paramForm.key || !paramForm.value) {
    ElMessage.warning('请填写参数键与参数值')
    return
  }
  paramSaving.value = true
  try {
    await request('/api/params', {
      method: 'POST',
      body: { ...paramForm, description: paramForm.description || null },
    })
    ElMessage.success('保存成功')
    paramDialogVisible.value = false
    fetchParams()
  }
  catch { /* 已统一提示 */ }
  finally {
    paramSaving.value = false
  }
}

async function handleParamDelete(row: ParamRow) {
  await ElMessageBox.confirm(`确认删除参数「${row.key}」？`, '提示', { type: 'warning' })
  await request(`/api/params/${encodeURIComponent(row.key)}`, { method: 'DELETE' })
  ElMessage.success('删除成功')
  fetchParams()
}

onMounted(() => {
  fetchStores()
  fetchParams()
})
</script>

<template>
  <el-card shadow="never">
    <el-tabs v-model="activeTab">
      <!-- 店铺配置 -->
      <el-tab-pane label="店铺管理" name="stores">
        <div class="toolbar">
          <div class="spacer" />
          <el-button type="primary" @click="openStoreCreate">新增店铺</el-button>
        </div>
        <el-table v-loading="storeLoading" :data="stores" border stripe>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" label="店铺名称" min-width="140" />
          <el-table-column prop="address" label="地址" min-width="220" />
          <el-table-column prop="businessHours" label="经营时段" width="130" />
          <el-table-column label="会员数" width="80">
            <template #default="{ row }">{{ row._count?.members ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="课程数" width="80">
            <template #default="{ row }">{{ row._count?.courses ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openStoreEdit(asStore(row))">编辑</el-button>
              <el-button link type="danger" @click="handleStoreDelete(asStore(row))">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="storePage"
          v-model:page-size="storePageSize"
          :total="storeTotal"
          layout="total, prev, pager, next"
          class="pagination"
          @change="fetchStores"
        />
      </el-tab-pane>

      <!-- 系统参数 -->
      <el-tab-pane label="系统参数" name="params">
        <div class="toolbar">
          <div class="spacer" />
          <el-button type="primary" @click="openParamCreate">新增参数</el-button>
        </div>
        <el-table v-loading="paramLoading" :data="params" border stripe>
          <el-table-column prop="key" label="参数键" min-width="160" />
          <el-table-column prop="value" label="参数值" min-width="180" />
          <el-table-column label="说明" min-width="200">
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openParamEdit(asParam(row))">编辑</el-button>
              <el-button link type="danger" @click="handleParamDelete(asParam(row))">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 店铺对话框 -->
    <el-dialog v-model="storeDialogVisible" :title="editingStoreId ? '编辑店铺' : '新增店铺'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="店铺名称" required>
          <el-input v-model="storeForm.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="地址" required>
          <el-input v-model="storeForm.address" maxlength="200" />
        </el-form-item>
        <el-form-item label="经营时段" required>
          <el-input v-model="storeForm.businessHours" placeholder="09:00-21:00" maxlength="11" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="storeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="storeSaving" @click="handleStoreSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 参数对话框 -->
    <el-dialog v-model="paramDialogVisible" :title="editingParamKey ? '编辑参数' : '新增参数'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="参数键" required>
          <el-input v-model="paramForm.key" :disabled="!!editingParamKey" maxlength="50" placeholder="如 booking.cancel.hours" />
        </el-form-item>
        <el-form-item label="参数值" required>
          <el-input v-model="paramForm.value" maxlength="500" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="paramForm.description" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paramDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="paramSaving" @click="handleParamSave">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.spacer {
  flex: 1;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
