<!-- 登录页 -->
<script setup lang="ts">
import { ElMessage } from 'element-plus'

definePageMeta({
  layout: 'blank',
  // 仅未登录可访问；已登录自动跳首页
  auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: '/' },
})

const { signIn, data: session } = useAuth()
const router = useRouter()

const form = reactive({ username: '', password: '' })
const loading = ref(false)

/** 根据用户角色获取默认首页 */
function getDefaultHome(role?: string): string {
  switch (role) {
    case 'TEACHER':
      return '/schedules'
    case 'MANAGER':
      return '/'
    case 'ADMINISTRATOR':
      return '/'
    default:
      return '/'
  }
}

/** 提交登录 */
async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await signIn({ username: form.username, password: form.password }, { redirect: false })
    // 登录成功后，根据用户角色跳转到对应的默认页面
    await nextTick()
    const homePath = getDefaultHome(session.value?.type)
    await router.push(homePath)
  }
  catch {
    ElMessage.error('用户名或密码错误')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">☯</div>
      <div class="login-title">太极空间</div>
      <p class="login-subtitle">登录会员课程管理系统</p>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="请输入账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          native-type="submit"
        >
          登 录
        </el-button>
      </el-form>
      <p class="login-footer">太极空间 · 会员全生命周期管理</p>
    </div>
  </div>
</template>

<style scoped>
/* shadcn 风格登录页：中性灰渐变底 + 白卡片，1px 边框 + 柔和大阴影 */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37, 99, 235, 0.08), transparent),
    linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border: 1px solid var(--ts-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--ts-shadow-lg);
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: var(--radius-lg);
  background: var(--ts-primary);
  color: #fff;
  font-size: 24px;
}

.login-title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ts-foreground);
}

.login-subtitle {
  text-align: center;
  color: var(--ts-muted-foreground);
  margin: 6px 0 28px;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 12px;
  color: #a1a1aa;
}
</style>
