<!-- 课程排期：日历视图 -->
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, computed, onMounted, nextTick } from 'vue'

/** 排期数据 */
interface ScheduleItem {
  id: number
  cardId: number
  memberId: number
  courseId: number
  startTime: string
  endTime: string
  status: 'PENDING' | 'COMPLETED'
  course: { id: number; name: string }
  card: { id: number; cardNo: string; coachId: number }
  member: { id: number; name: string }
}

const { request } = useApi()

// ---------- 当前登录用户 ----------
const currentUser = ref<{ id: number; name: string; type: string } | null>(null)

async function fetchCurrentUser() {
  try {
    const res = await request<{ id: number; name: string; type: string }>('/api/auth/session')
    currentUser.value = res
  }
  catch { /* 已统一提示 */ }
}

// ---------- 日历状态 ----------
const currentDate = ref(new Date())
const schedules = ref<ScheduleItem[]>([])
const loading = ref(false)
const calendarWrapper = ref<HTMLElement | null>(null)

// 获取本周一
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// 获取一周的日期列表
const weekDates = computed(() => {
  const monday = getMonday(currentDate.value)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }
  return dates
})

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取一周的起止日期
const weekRange = computed(() => {
  const dates = weekDates.value
  return {
    start: formatDate(dates[0]),
    end: formatDate(dates[6]),
  }
})

// 星期几的名称
const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 24小时时间段
const timeSlots = Array.from({ length: 24 }, (_, i) => i)

// ---------- 切换日期 ----------
function prevWeek() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - 7)
  currentDate.value = d
  fetchSchedules()
}

function nextWeek() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + 7)
  currentDate.value = d
  fetchSchedules()
}

function goToToday() {
  currentDate.value = new Date()
  fetchSchedules()
}

// 切换年月
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

function switchToMonth() {
  currentDate.value = new Date(selectedYear.value, selectedMonth.value - 1, 1)
  fetchSchedules()
}

// 年份选项
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

// 月份选项
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

// ---------- 获取排期数据 ----------
async function fetchSchedules() {
  loading.value = true
  try {
    const res = await request<{ items: ScheduleItem[] }>('/api/schedules/calendar', {
      query: {
        startDate: weekRange.value.start,
        endDate: weekRange.value.end,
        staffId: currentUser.value?.id || undefined,
      },
    })
    schedules.value = res.items
  }
  catch { /* 已统一提示 */ }
  finally {
    loading.value = false
  }
}

// ---------- 日历单元格数据 ----------
interface CalendarCell {
  date: Date
  hour: number
  schedule: ScheduleItem | null
}

// 生成日历网格数据
const calendarGrid = computed(() => {
  const grid: CalendarCell[][] = []

  // 按小时遍历
  for (let hour = 0; hour < 24; hour++) {
    const row: CalendarCell[] = []

    // 按星期几遍历
    for (let day = 0; day < 7; day++) {
      const date = weekDates.value[day]
      const cellDate = new Date(date)
      cellDate.setHours(hour, 0, 0, 0)

      // 查找该时间段的排期
      const schedule = schedules.value.find((s) => {
        const startTime = new Date(s.startTime)
        const endTime = new Date(s.endTime)
        return startTime <= cellDate && endTime > cellDate
      })

      row.push({
        date: cellDate,
        hour,
        schedule: schedule || null,
      })
    }

    grid.push(row)
  }

  return grid
})

// ---------- 点击方格确认上课 ----------
async function handleCellClick(cell: CalendarCell) {
  if (!cell.schedule) return

  const schedule = cell.schedule
  if (schedule.status === 'COMPLETED') {
    ElMessage.info('该课程已标记为已上课')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认课程 "${schedule.course.name}"（会员：${schedule.member.name}）已上课？`,
      '确认上课',
      {
        confirmButtonText: '确认已上课',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  }
  catch {
    return // 用户取消
  }

  try {
    await request(`/api/schedules/${schedule.id}`, {
      method: 'PUT',
      body: { status: 'COMPLETED' },
    })
    ElMessage.success('已标记为已上课')
    fetchSchedules()
  }
  catch { /* 已统一提示 */ }
}

// ---------- 时间格式化 ----------
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 获取课程状态颜色
function getStatusColor(schedule: ScheduleItem | null): string {
  if (!schedule) return 'transparent'
  return schedule.status === 'COMPLETED' ? 'rgba(103, 194, 58, 0.3)' : 'rgba(64, 158, 255, 0.3)'
}

// ---------- 初始化 ----------
onMounted(() => {
  fetchCurrentUser().then(() => {
    fetchSchedules().then(() => {
      nextTick(() => {
        scrollToEightAM()
      })
    })
  })
})

// 滚动到 8:00
function scrollToEightAM() {
  if (calendarWrapper.value) {
    // 8:00 对应第 8 行（0-indexed），每行高度约 60px
    const scrollTop = 8 * 60
    calendarWrapper.value.scrollTop = scrollTop
  }
}
</script>

<template>
  <div class="calendar-container">
    <!-- 头部工具栏 -->
    <div class="calendar-header">
      <div class="nav-buttons">
        <el-button @click="prevWeek">
          <el-icon>上周</el-icon>
        </el-button>
        <el-button type="primary" @click="goToToday">今天</el-button>
        <el-button @click="nextWeek">
          <el-icon>下周</el-icon>
        </el-button>
      </div>

      <div class="month-selector">
        <el-select v-model="selectedYear" class="year-select" @change="switchToMonth">
          <el-option v-for="year in yearOptions" :key="year" :label="`${year}年`" :value="year" />
        </el-select>
        <el-select v-model="selectedMonth" class="month-select" @change="switchToMonth">
          <el-option v-for="month in monthOptions" :key="month" :label="`${month}月`" :value="month" />
        </el-select>
      </div>

      <div class="current-info">
        <span v-if="currentUser" class="teacher-name">教练：{{ currentUser.name }}</span>
        <span class="date-range">{{ weekRange.start }} ~ {{ weekRange.end }}</span>
      </div>
    </div>

    <!-- 日历表格 -->
    <div v-loading="loading" ref="calendarWrapper" class="calendar-table-wrapper">
      <table class="calendar-table">
        <thead class="calendar-thead">
          <tr>
            <th class="time-header">时间</th>
            <th v-for="(date, index) in weekDates" :key="index" class="day-header">
              <div class="day-name">{{ weekDayNames[index] }}</div>
              <div class="day-date" :class="{ 'is-today': formatDate(date) === formatDate(new Date()) }">
                {{ date.getDate() }}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in calendarGrid" :key="rowIndex">
            <td class="time-cell">
              {{ String(rowIndex).padStart(2, '0') }}:00
            </td>
            <td
              v-for="(cell, colIndex) in row"
              :key="colIndex"
              class="calendar-cell"
              :class="{
                'has-schedule': cell.schedule,
                'is-completed': cell.schedule?.status === 'COMPLETED',
                'is-clickable': cell.schedule && cell.schedule.status !== 'COMPLETED',
              }"
              :style="{ backgroundColor: getStatusColor(cell.schedule) }"
              @click="handleCellClick(cell)"
            >
              <div v-if="cell.schedule" class="schedule-info">
                <div class="course-name">{{ cell.schedule.course.name }}</div>
                <div class="member-name">{{ cell.schedule.member.name }}</div>
                <div class="time-range">
                  {{ formatTime(cell.schedule.startTime) }} - {{ formatTime(cell.schedule.endTime) }}
                </div>
                <div v-if="cell.schedule.status === 'COMPLETED'" class="status-badge completed">
                  已上课
                </div>
                <div v-else class="status-badge pending">
                  未上课
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-color" style="background-color: rgba(64, 158, 255, 0.3);"></span>
        <span>未上课（点击确认）</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background-color: rgba(103, 194, 58, 0.3);"></span>
        <span>已上课</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-container {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.nav-buttons {
  display: flex;
  gap: 8px;
}

.month-selector {
  display: flex;
  gap: 8px;
}

.year-select {
  width: 100px;
}

.month-select {
  width: 80px;
}

.current-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.teacher-name {
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}

.date-range {
  font-size: 14px;
  color: #606266;
}

.calendar-table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 600px;
  position: relative;
}

.calendar-thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #f5f7fa;
}

.calendar-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.calendar-table th,
.calendar-table td {
  border: 1px solid #ebeef5;
  padding: 0;
}

.time-header {
  width: 70px;
  background-color: #f5f7fa;
  font-weight: 600;
  text-align: center;
  padding: 10px 0;
}

.day-header {
  background-color: #f5f7fa;
  text-align: center;
  padding: 10px 0;
  min-width: 120px;
}

.day-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.day-date {
  font-size: 18px;
  font-weight: 700;
  width: 32px;
  height: 32px;
  line-height: 32px;
  margin: 0 auto;
  border-radius: 50%;
}

.day-date.is-today {
  background-color: #409eff;
  color: #fff;
}

.time-cell {
  background-color: #f5f7fa;
  text-align: center;
  font-size: 12px;
  color: #909399;
  padding: 8px 4px;
  vertical-align: top;
}

.calendar-cell {
  height: 60px;
  vertical-align: top;
  padding: 4px;
  transition: background-color 0.2s;
  cursor: default;
}

.calendar-cell.has-schedule {
  cursor: pointer;
}

.calendar-cell.has-schedule:hover {
  opacity: 0.8;
}

.calendar-cell.is-completed {
  cursor: not-allowed;
}

.schedule-info {
  font-size: 12px;
  line-height: 1.4;
  padding: 4px;
  border-radius: 4px;
  height: 100%;
  overflow: hidden;
}

.course-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #606266;
}

.time-range {
  color: #909399;
  font-size: 11px;
  margin-top: 2px;
}

.status-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
}

.status-badge.completed {
  background-color: #67c23a;
  color: #fff;
}

.status-badge.pending {
  background-color: #409eff;
  color: #fff;
}

.legend {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  justify-content: flex-end;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}
</style>
