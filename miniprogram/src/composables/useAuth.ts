import { ref } from 'vue'
import {
  clearToken,
  getAuthConfig,
  getDevOpenid,
  getMe,
  loginWithDev,
  loginWithWechat,
  setToken,
} from '../api/client'
import type { AuthUser } from '../types'

const user = ref<AuthUser | null>(null)
const ready = ref(false)
const authError = ref('')

export function useAuth() {
  async function ensureLogin() {
    authError.value = ''
    const token = uni.getStorageSync('accessToken') as string
    if (token) {
      try {
        user.value = await getMe()
        ready.value = true
        return
      } catch {
        clearToken()
      }
    }

    try {
      const wxLogin = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: resolve,
          fail: reject,
        })
      })
      if (wxLogin.code) {
        const result = await loginWithWechat(wxLogin.code)
        setToken(result.accessToken)
        user.value = result.user
        ready.value = true
        return
      }
    } catch {
      // fall through to dev login
    }

    try {
      const config = await getAuthConfig()
      if (!config.devLoginEnabled) {
        throw new Error('微信登录失败，且未开启开发登录')
      }
      const result = await loginWithDev(getDevOpenid(), '开发用户')
      setToken(result.accessToken)
      user.value = result.user
      ready.value = true
    } catch (error) {
      authError.value = error instanceof Error ? error.message : '登录失败'
      ready.value = false
      throw error
    }
  }

  return {
    user,
    ready,
    authError,
    ensureLogin,
  }
}
