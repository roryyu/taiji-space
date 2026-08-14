<!-- 会员卡管理：开卡 / 有效期管理 / 流水查询 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

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
  member: { id: number; name: string; phone: string }
  store: { id: number; name: string }
  course: { id: number; name: string }
  coach: { id: number; name: string }
  creator: { id: number; name: string } | null
}

/** 卡流水记录 */
interface TxRow {
  id: number
  type: keyof typeof TxTypeLabels
  amount: string
  remark: string | null
  createdAt: string
}

/** 选项数据 */
interface OptionItem { id: number; name: string }
interface StoreOption { id: number; name: string; staffId: number | null }
interface StaffOption { id: number; name: string; type: string }
interface MemberOption { id: number; name: string; phone: string }

const asRow = (row: unknown) => row as CardRow

const { request } = useApi()
const { data: session } = useAuth()

// 当前用户是否为管理员（管理员不可编辑）
const isAdmin = computed(() => session.value?.type === 'ADMINISTRATOR')
// 当前用户是否为经理
const isManager = computed(() => session.value?.type === 'MANAGER')
// 当前用户ID
const currentUserId = computed(() => session.value?.id)

/** 判断是否可以编辑该卡片 */
function canEdit(row: CardRow): boolean {
  // ADMINISTRATOR 可编辑所有
  if (isAdmin.value) return true
  // MANAGER 只能编辑自己创建的
  if (isManager.value) return row.staffId === currentUserId.value
  // 其他角色不可编辑
  return false
}

// ---------- 列表状态 ----------
const loading = ref(false)
const items = ref<CardRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', storeId: undefined as number | undefined, courseId: undefined as number | undefined, coachId: undefined as number | undefined })

// 下拉选项
const stores = ref<StoreOption[]>([])
const courses = ref<OptionItem[]>([])
const staff = ref<StaffOption[]>([])
const members = ref<MemberOption[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await request<{ items: CardRow[]; total: number }>('/api/cards', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        storeId: filters.storeId || undefined,
        courseId: filters.courseId || undefined,
        coachId: filters.coachId || undefined,
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

/** 拉取下拉选项 */
async function fetchOptions() {
  try {
    const res = await request<{ stores: StoreOption[]; staffs: StaffOption[]; members: MemberOption[]; courses: (OptionItem & { storeId: number; staffId: number })[] }>('/api/options')
    stores.value = res.stores
    staff.value = res.staffs
    members.value = res.members
    courses.value = res.courses
  }
  catch { /* 已统一提示 */ }
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
const createVisible = ref(false)
const saving = ref(false)
const createForm = reactive({
  memberId: undefined as number | undefined,
  storeId: undefined as number | undefined,
  courseId: undefined as number | undefined,
  coachId: undefined as number | undefined,
  createStaffId: undefined as number | undefined, // ADMINISTRATOR 可选择 MANAGER
  totalAmount: 0,
  totalSessions: 0,
  giftSessions: 0,
  range: [] as string[],
})

/** 监听门店选择，自动填充店长到负责员工（仅 ADMINISTRATOR） */
watch(() => createForm.storeId, (storeId) => {
  if (isAdmin.value && storeId) {
    const store = stores.value.find(s => s.id === storeId)
    if (store?.staffId) {
      createForm.createStaffId = store.staffId
    }
  }
})

/** 筛选出 TEACHER 类型的员工选项（授课教师） */
const teacherOptions = computed(() => (staff.value || []).filter(s => s.type === 'TEACHER'))

/** 筛选出 MANAGER 类型的员工选项 */
const managerOptions = computed(() => (staff.value || []).filter(s => s.type === 'MANAGER'))

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
  createVisible.value = true
  Object.assign(createForm, {
    memberId: undefined, storeId: undefined, courseId: undefined, coachId: undefined,
    createStaffId: undefined, totalAmount: 0, totalSessions: 0, giftSessions: 0, range: [],
  })
  if (!stores.value.length) {
    await fetchOptions()
  }
  if (!members.value.length) {
    await loadMemberOptions()
  }
}

async function handleCreate() {
  if (!createForm.memberId || !createForm.storeId || !createForm.courseId || !createForm.coachId || createForm.range.length !== 2) {
    ElMessage.warning('请填写完整信息')
    return
  }
  // ADMINISTRATOR 必须选择一个 MANAGER
  if (isAdmin.value && !createForm.createStaffId) {
    ElMessage.warning('请选择负责员工')
    return
  }
  saving.value = true
  try {
    await request('/api/cards', {
      method: 'POST',
      body: {
        memberId: createForm.memberId,
        storeId: createForm.storeId,
        courseId: createForm.courseId,
        coachId: createForm.coachId,
        staffId: isAdmin.value ? createForm.createStaffId : undefined,
        totalAmount: createForm.totalAmount,
        totalSessions: createForm.totalSessions,
        giftSessions: createForm.giftSessions,
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

// ---------- 编辑 ----------
const editVisible = ref(false)
const editingId = ref<number | null>(null)
const editForm = reactive({
  storeId: undefined as number | undefined,
  courseId: undefined as number | undefined,
  coachId: undefined as number | undefined,
  staffId: undefined as number | undefined, // ADMINISTRATOR 可修改负责员工
  totalAmount: 0,
  totalSessions: 0,
  giftSessions: 0,
  range: [] as string[],
})

/** 监听门店选择，自动填充店长到负责员工（仅 ADMINISTRATOR） */
watch(() => editForm.storeId, (storeId) => {
  if (isAdmin.value && storeId) {
    const store = stores.value.find(s => s.id === storeId)
    if (store?.staffId) {
      editForm.staffId = store.staffId
    }
  }
})

async function openEdit(row: CardRow) {
  editingId.value = row.id
  Object.assign(editForm, {
    storeId: row.storeId,
    courseId: row.courseId,
    coachId: row.coachId,
    staffId: row.staffId ?? undefined,
    totalAmount: row.totalAmount,
    totalSessions: row.totalSessions,
    giftSessions: row.giftSessions,
    range: [fmtDate(row.validFrom), fmtDate(row.validTo)],
  })
  editVisible.value = true
  // 确保选项数据已加载
  if (!stores.value.length) {
    await fetchOptions()
  }
}

async function handleEdit() {
  if (!editingId.value || !editForm.storeId || !editForm.courseId || !editForm.coachId || editForm.range.length !== 2) {
    ElMessage.warning('请填写完整信息')
    return
  }
  // ADMINISTRATOR 必须指定负责员工
  if (isAdmin.value && !editForm.staffId) {
    ElMessage.warning('请选择负责员工')
    return
  }
  saving.value = true
  try {
    await request(`/api/cards/${editingId.value}`, {
      method: 'PUT',
      body: {
        storeId: editForm.storeId,
        courseId: editForm.courseId,
        coachId: editForm.coachId,
        staffId: isAdmin.value ? editForm.staffId : undefined,
        totalAmount: editForm.totalAmount,
        totalSessions: editForm.totalSessions,
        giftSessions: editForm.giftSessions,
        validFrom: editForm.range[0],
        validTo: editForm.range[1],
      },
    })
    ElMessage.success('编辑成功')
    editVisible.value = false
    fetchList()
  }
  catch { /* 已统一提示 */ }
  finally {
    saving.value = false
  }
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
  catch { /* 已统一提示 */ }
  finally {
    txLoading.value = false
  }
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
      <el-input v-model="filters.keyword" placeholder="卡号 / 会员姓名 / 手机号" clearable class="w-220" @keyup.enter="handleSearch" />
      <el-select v-model="filters.storeId" placeholder="门店" clearable class="w-140">
        <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-select v-model="filters.courseId" placeholder="课程" clearable class="w-140">
        <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="filters.coachId" placeholder="员工" clearable class="w-140">
        <el-option v-for="t in staff" :key="t.id" :label="t.name" :value="t.id" />
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
      <el-table-column label="门店" width="120">
        <template #default="{ row }">{{ row.store?.name }}</template>
      </el-table-column>
      <el-table-column label="课程" width="120">
        <template #default="{ row }">{{ row.course?.name }}</template>
      </el-table-column>
      <el-table-column label="授课教师" width="100">
        <template #default="{ row }">{{ row.coach?.name }}</template>
      </el-table-column>
      <el-table-column label="创建人" width="100">
        <template #default="{ row }">{{ row.creator?.name ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="总金额" width="90">
        <template #default="{ row }">{{ row.totalAmount }} 元</template>
      </el-table-column>
      <el-table-column label="次数" width="80">
        <template #default="{ row }">{{ row.totalSessions }}</template>
      </el-table-column>
      <el-table-column label="赠送次数" width="90">
        <template #default="{ row }">{{ row.giftSessions }}</template>
      </el-table-column>
      <el-table-column label="有效期" width="200">
        <template #default="{ row }">{{ fmtDate(row.validFrom) }} ~ {{ fmtDate(row.validTo) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit(asRow(row))" link type="primary" @click="openEdit(asRow(row))">编辑</el-button>
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
    <el-dialog v-model="createVisible" title="开卡" width="520px">
      <el-form label-width="90px">
        <el-form-item label="会员" required>
          <el-select
            v-model="createForm.memberId"
            filterable
            remote
            :remote-method="searchMembers"
            :loading="memberLoading"
            placeholder="搜索会员"
          >
            <el-option v-for="m in members" :key="m.id" :label="`${m.name}（${m.phone}）`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="门店" required>
          <el-select v-model="createForm.storeId" placeholder="请选择门店">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程" required>
          <el-select v-model="createForm.courseId" placeholder="请选择课程">
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="授课教师" required>
          <el-select v-model="createForm.coachId" placeholder="请选择授课教师">
            <el-option v-for="t in teacherOptions" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isAdmin" label="负责员工" required>
          <el-select v-model="createForm.createStaffId" placeholder="请选择负责员工">
            <el-option v-for="m in managerOptions" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="总金额">
          <el-input-number v-model="createForm.totalAmount" :min="0" />
          <span class="form-tip">元</span>
        </el-form-item>
        <el-form-item label="总次数">
          <el-input-number v-model="createForm.totalSessions" :min="0" />
        </el-form-item>
        <el-form-item label="赠送次数">
          <el-input-number v-model="createForm.giftSessions" :min="0" />
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

    <!-- 编辑对话框 -->
    <el-dialog v-model="editVisible" title="编辑会员卡" width="520px">
      <el-form label-width="90px">
        <el-form-item label="会员">
          <el-input :value="items.find(r => r.id === editingId)?.member ? `${items.find(r => r.id === editingId)!.member.name}（${items.find(r => r.id === editingId)!.member.phone}）` : ''" disabled />
        </el-form-item>
        <el-form-item label="门店" required>
          <el-select v-model="editForm.storeId" placeholder="请选择门店">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程" required>
          <el-select v-model="editForm.courseId" placeholder="请选择课程">
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="授课教师" required>
          <el-select v-model="editForm.coachId" placeholder="请选择授课教师">
            <el-option v-for="t in teacherOptions" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isAdmin" label="负责员工" required>
          <el-select v-model="editForm.staffId" placeholder="请选择负责员工">
            <el-option v-for="m in managerOptions" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="总金额">
          <el-input-number v-model="editForm.totalAmount" :min="0" />
          <span class="form-tip">元</span>
        </el-form-item>
        <el-form-item label="总次数">
          <el-input-number v-model="editForm.totalSessions" :min="0" />
        </el-form-item>
        <el-form-item label="赠送次数">
          <el-input-number v-model="editForm.giftSessions" :min="0" />
        </el-form-item>
        <el-form-item label="有效期" required>
          <el-date-picker v-model="editForm.range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
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
        <el-table-column prop="amount" label="金额" width="100" />
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
