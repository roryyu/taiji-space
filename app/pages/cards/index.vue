<!-- 会员卡管理：开卡 / 充值 / 冻结 / 解冻 / 有效期管理 / 流水查询 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

/** 会员卡行数据（对应 /api/cards 响应） */
interface CardRow {
  id: number
  cardNo: string
  type: keyof typeof CardTypeLabels
  status: keyof typeof CardStatusLabels
  balance: string
  validFrom: string
  validTo: string
  member: { id: number; name: string; phone: string }
}

/** 卡流水记录 */
interface TxRow {
  id: number
  type: keyof typeof TxTypeLabels
  amount: string
  remark: string | null
  createdAt: string
}

const asRow = (row: unknown) => row as CardRow

const { request } = useApi()

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<CardRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', type: '', status: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: CardRow[]; total: number }>('/api/cards', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        type: filters.type || undefined,
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

function handleSearch() {
  page.value = 1
  fetchList()
}

/** 日期格式化（YYYY-MM-DD） */
function fmtDate(v: string) {
  return v ? v.slice(0, 10) : '-'
}

// ---------- 开卡 ----------
const members = ref<{ id: number; name: string; phone: string }[]>([])
const createVisible = ref(false)
const saving = ref(false)
const createForm = reactive({
  memberId: undefined as number | undefined,
  type: 'COUNT' as string,
  balance: 0,
  range: [] as string[],
})

async function openCreate() {
  createVisible.value = true
  Object.assign(createForm, { memberId: undefined, type: 'COUNT', balance: 0, range: [] })
  if (!members.value.length) {
    const res = await request<{ members: { id: number; name: string; phone: string }[] }>('/api/options')
    members.value = res.members
  }
}

async function handleCreate() {
  if (!createForm.memberId || createForm.range.length !== 2) {
    ElMessage.warning('请选择会员并设置有效期')
    return
  }
  saving.value = true
  try {
    await request('/api/cards', {
      method: 'POST',
      body: {
        memberId: createForm.memberId,
        type: createForm.type,
        balance: createForm.balance,
        validFrom: createForm.range[0],
        validTo: createForm.range[1],
      },
    })
    ElMessage.success('开卡成功')
    createVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

// ---------- 充值 ----------
const rechargeVisible = ref(false)
const rechargeCard = ref<CardRow | null>(null)
const rechargeForm = reactive({ amount: 100, remark: '' })

function openRecharge(row: CardRow) {
  rechargeCard.value = row
  Object.assign(rechargeForm, { amount: 100, remark: '' })
  rechargeVisible.value = true
}

async function handleRecharge() {
  if (!rechargeCard.value) return
  saving.value = true
  try {
    await request(`/api/cards/${rechargeCard.value.id}/recharge`, {
      method: 'POST',
      body: { amount: rechargeForm.amount, remark: rechargeForm.remark || undefined },
    })
    ElMessage.success('充值成功')
    rechargeVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

// ---------- 冻结 / 解冻 ----------
async function handleFreeze(row: CardRow) {
  await ElMessageBox.confirm(`确认冻结卡「${row.cardNo}」？冻结后不可充值/预约。`, '提示', { type: 'warning' })
  await request(`/api/cards/${row.id}/freeze`, { method: 'POST' })
  ElMessage.success('已冻结')
  fetchList()
}

async function handleUnfreeze(row: CardRow) {
  await request(`/api/cards/${row.id}/unfreeze`, { method: 'POST' })
  ElMessage.success('已解冻')
  fetchList()
}

// ---------- 有效期管理 ----------
const extendVisible = ref(false)
const extendCard = ref<CardRow | null>(null)
const extendForm = reactive({ validTo: '' })

function openExtend(row: CardRow) {
  extendCard.value = row
  extendForm.validTo = ''
  extendVisible.value = true
}

async function handleExtend() {
  if (!extendCard.value || !extendForm.validTo) {
    ElMessage.warning('请选择新的有效期')
    return
  }
  saving.value = true
  try {
    await request(`/api/cards/${extendCard.value.id}/extend`, {
      method: 'POST',
      body: { validTo: extendForm.validTo },
    })
    ElMessage.success('有效期已更新')
    extendVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
}

// ---------- 流水 ----------
const txVisible = ref(false)
const txLoading = ref(false)
const txItems = ref<TxRow[]>([])
const txCard = ref<CardRow | null>(null)

async function openTransactions(row: CardRow) {
  txCard.value = row
  txVisible.value = true
  txLoading.value = true
  try {
    const res = await request<{ items: TxRow[] }>(`/api/cards/${row.id}/transactions`)
    txItems.value = res.items
  }
  finally {
    txLoading.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <el-card shadow="never">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-input v-model="filters.keyword" placeholder="卡号 / 会员姓名 / 手机号" clearable class="w-220" @keyup.enter="handleSearch" />
      <el-select v-model="filters.type" placeholder="会员卡类型" clearable class="w-140">
        <el-option v-for="(label, key) in CardTypeLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" clearable class="w-140">
        <el-option v-for="(label, key) in CardStatusLabels" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">开卡</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="cardNo" label="卡号" min-width="170" />
      <el-table-column label="会员" min-width="120">
        <template #default="{ row }">{{ row.member?.name }}（{{ row.member?.phone }}）</template>
      </el-table-column>
      <el-table-column label="会员卡类型" width="100">
        <template #default="{ row }">{{ CardTypeLabels[asRow(row).type] }}</template>
      </el-table-column>
      <el-table-column label="余额/次数" width="100">
        <template #default="{ row }">{{ row.balance }}</template>
      </el-table-column>
      <el-table-column label="有效期" width="200">
        <template #default="{ row }">{{ fmtDate(row.validFrom) }} ~ {{ fmtDate(row.validTo) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : row.status === 'FROZEN' ? 'warning' : 'danger'">
            {{ CardStatusLabels[asRow(row).status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="row.status !== 'ACTIVE'" @click="openRecharge(asRow(row))">充值</el-button>
          <el-button v-if="row.status !== 'FROZEN'" link type="warning" :disabled="row.status === 'EXPIRED'" @click="handleFreeze(asRow(row))">冻结</el-button>
          <el-button v-else link type="success" @click="handleUnfreeze(asRow(row))">解冻</el-button>
          <el-button link type="primary" @click="openExtend(asRow(row))">延期</el-button>
          <el-button link @click="openTransactions(asRow(row))">流水</el-button>
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

    <!-- 开卡对话框 -->
    <el-dialog v-model="createVisible" title="开卡" width="480px">
      <el-form label-width="90px">
        <el-form-item label="会员" required>
          <el-select v-model="createForm.memberId" filterable placeholder="搜索会员">
            <el-option v-for="m in members" :key="m.id" :label="`${m.name}（${m.phone}）`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="卡类型">
          <el-radio-group v-model="createForm.type">
            <el-radio-button v-for="(label, key) in CardTypeLabels" :key="key" :value="key">{{ label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="初始额度">
          <el-input-number v-model="createForm.balance" :min="0" :precision="2" />
          <span class="form-tip">次卡为次数，储值卡为金额</span>
        </el-form-item>
        <el-form-item label="有效期" required>
          <el-date-picker v-model="createForm.range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">确认开卡</el-button>
      </template>
    </el-dialog>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeVisible" :title="`充值 - ${rechargeCard?.cardNo ?? ''}`" width="420px">
      <el-form label-width="90px">
        <el-form-item label="充值额度" required>
          <el-input-number v-model="rechargeForm.amount" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rechargeForm.remark" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleRecharge">确认充值</el-button>
      </template>
    </el-dialog>

    <!-- 延期对话框 -->
    <el-dialog v-model="extendVisible" :title="`有效期管理 - ${extendCard?.cardNo ?? ''}`" width="420px">
      <el-form label-width="110px">
        <el-form-item label="当前有效期至">
          <span>{{ extendCard ? fmtDate(extendCard.validTo) : '-' }}</span>
        </el-form-item>
        <el-form-item label="延长至" required>
          <el-date-picker v-model="extendForm.validTo" type="date" value-format="YYYY-MM-DD" placeholder="选择新有效期" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="extendVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleExtend">确认延期</el-button>
      </template>
    </el-dialog>

    <!-- 流水对话框 -->
    <el-dialog v-model="txVisible" :title="`交易流水 - ${txCard?.cardNo ?? ''}`" width="560px">
      <el-table v-loading="txLoading" :data="txItems" border size="small" max-height="400">
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ TxTypeLabels[(row as TxRow).type] }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额/次数" width="100" />
        <el-table-column prop="remark" label="备注" min-width="140" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
        </el-table-column>
      </el-table>
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

.w-220 { width: 220px; }
.w-140 { width: 140px; }

.form-tip {
  margin-left: 8px;
  color: #8c8c8c;
  font-size: 12px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
