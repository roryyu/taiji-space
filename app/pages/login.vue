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
      <div class="login-title">
        <span class="logo-icon">☯</span>
        <h1>太极空间</h1>
      </div>
      <p class="login-subtitle">会员课程管理系统</p>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
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
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #001529 0%, #1677ff 100%);
}

.login-card {
  width: 380px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.login-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.login-title h1 {
  font-size: 24px;
  color: #262626;
  margin: 0;
}

.logo-icon {
  font-size: 28px;
}

.login-subtitle {
  text-align: center;
  color: #8c8c8c;
  margin: 8px 0 28px;
  font-size: 14px;
}

.login-btn {
  width: 100%;
}
</style>
