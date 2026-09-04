<!-- 主布局：主流 toB 管理系统样式（左侧深色菜单 + 顶栏 + 内容区） -->
<script setup lang="ts">
import {
  DataAnalysis,
  User,
  CreditCard,
  Reading,
  Calendar,
  Tickets,
  ChatDotSquare,
  Avatar,
  TrendCharts,
  Setting,
  Fold,
  Expand,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const { data: session, signOut } = useAuth()

/** 侧边栏折叠状态 */
const collapsed = ref(false)

/** 菜单配置：路径 + 名称 + 图标 + 权限 */
const allMenus = [
  { path: '/', title: '工作台', icon: DataAnalysis, roles: ['MANAGER', 'ADMINISTRATOR'] },
  { path: '/members', title: '会员信息', icon: User, roles: ['MANAGER', 'ADMINISTRATOR'] },
  { path: '/cards', title: '会员卡', icon: CreditCard, roles: ['MANAGER', 'ADMINISTRATOR'] },
  { path: '/courses', title: '课程管理', icon: Reading, roles: ['MANAGER', 'ADMINISTRATOR'] },
  { path: '/bookings', title: '课程预约', icon: Tickets, roles: ['TEACHER', 'MANAGER', 'ADMINISTRATOR'] },
  { path: '/schedules', title: '课程排期', icon: Calendar, roles: ['TEACHER'] },

  { path: '/reviews', title: '课程评价', icon: ChatDotSquare, roles: ['MANAGER', 'ADMINISTRATOR'] },
  { path: '/staffs', title: '员工管理', icon: Avatar, roles: ['ADMINISTRATOR'] },
  { path: '/analytics', title: '运营分析', icon: TrendCharts, roles: ['MANAGER', 'ADMINISTRATOR'] },
  { path: '/settings', title: '系统配置', icon: Setting, roles: ['ADMINISTRATOR'] },
]

/** 检查用户是否有权限访问当前路径 */
function hasPermission(path: string, role: string): boolean {
  const menu = allMenus.find(m => m.path === path)
  return menu ? menu.roles.includes(role) : true
}

/** 根据用户角色过滤菜单 */
const menus = computed(() => {
  const userRole = session.value?.type || 'TEACHER'
  return allMenus.filter(menu => menu.roles.includes(userRole))
})

/** TEACHER角色访问无权限页面时重定向到课程排期 */
if (import.meta.client) {
  watch(() => [session.value?.type, route.path], ([type, path]) => {
    if (type && !hasPermission(path, type)) {
      const userRole = type as string
      const defaultPath = userRole === 'TEACHER' ? '/schedules' : '/'
      router.replace(defaultPath)
    }
  }, { immediate: true })
}

/** 当前页面标题（顶栏面包屑用） */
const currentTitle = computed(
  () => menus.value.find((m) => m.path === route.path)?.title ?? '太极空间',
)

/** 退出登录 */
async function handleLogout() {
  await signOut({ callbackUrl: '/login' })
}
</script>

<template>
  <el-container class="admin-layout">
    <!-- 左侧深色菜单 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-aside">
      <div class="logo">
        <span class="logo-icon">☯</span>
        <span v-if="!collapsed" class="logo-text">太极空间</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="collapsed"
        :collapse-transition="false"
        router
        class="admin-menu"
      >
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed">
            <Expand v-if="collapsed" />
            <Fold v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>太极空间</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <el-dropdown @command="handleLogout">
          <span class="user-info">
            <el-avatar :size="30" class="user-avatar">
              {{ (session?.name || 'A').slice(0, 1) }}
            </el-avatar>
            <span class="user-name">{{ session?.name || '管理员' }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <!-- 内容区 -->
      <el-main class="admin-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  height: 100vh;
}

/* 浅色侧栏：shadcn Sidebar 风格（弱底色 + 1px 右边框） */
.admin-aside {
  background-color: var(--ts-sidebar);
  border-right: 1px solid var(--ts-border);
  transition: width 0.2s;
  overflow-x: hidden;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 56px;
  color: var(--ts-foreground);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: 1px solid var(--ts-border);
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--ts-primary);
  color: #fff;
  font-size: 16px;
}

.admin-menu {
  border-right: none;
  padding: 8px;
  background-color: transparent;
}

/* 菜单项：圆角化，选中态为品牌色弱底 + 品牌色文字 */
.admin-menu :deep(.el-menu-item) {
  border-radius: var(--radius-md);
  margin-bottom: 2px;
  font-weight: 500;
  color: var(--ts-sidebar-foreground);
}

.admin-menu :deep(.el-menu-item:hover) {
  background-color: var(--ts-muted);
}

.admin-menu :deep(.el-menu-item.is-active) {
  background-color: var(--ts-sidebar-accent);
  color: var(--ts-sidebar-accent-foreground);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid var(--ts-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  font-size: 16px;
  cursor: pointer;
  color: var(--ts-muted-foreground);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.collapse-btn:hover {
  background: var(--ts-muted);
  color: var(--ts-foreground);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background-color 0.15s ease;
}

.user-info:hover {
  background: var(--ts-muted);
}

.user-avatar {
  background: var(--ts-foreground);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  color: var(--ts-foreground);
  font-weight: 500;
}

.admin-main {
  background: var(--ts-background);
  padding: 24px;
  overflow-y: auto;
}
</style>
