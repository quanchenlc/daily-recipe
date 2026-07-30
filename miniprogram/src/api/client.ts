const TOKEN_KEY = 'accessToken'
const DEV_OPENID_KEY = 'devOpenid'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
) ?? 'https://daily-recipe-production.up.railway.app'

export function getApiBase() {
  return API_BASE
}

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) as string
}

export function setToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

export function getDevOpenid() {
  let openid = uni.getStorageSync(DEV_OPENID_KEY) as string
  if (!openid) {
    openid = `dev-${Date.now()}`
    uni.setStorageSync(DEV_OPENID_KEY, openid)
  }
  return openid
}

async function request<T>(path: string, init?: UniApp.RequestOptions): Promise<T> {
  const token = getToken()
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.header as Record<string, string> | undefined),
  }
  if (token) {
    header.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api${path}`,
      method: init?.method ?? 'GET',
      data: init?.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
          return
        }
        const body = res.data as { message?: string | string[] }
        let message = `请求失败 (${res.statusCode})`
        if (Array.isArray(body?.message)) message = body.message.join('；')
        else if (body?.message) message = body.message
        reject(new Error(message))
      },
      fail: (err) => reject(new Error(err.errMsg || '网络错误')),
    })
  })
}

export function getAuthConfig() {
  return request<{ devLoginEnabled: boolean }>('/auth/config')
}

export function loginWithWechat(code: string) {
  return request<import('./types').LoginResponse>('/auth/wechat/login', {
    method: 'POST',
    data: { code },
  })
}

export function loginWithDev(openid: string, nickname?: string) {
  return request<import('./types').LoginResponse>('/auth/dev/login', {
    method: 'POST',
    data: { openid, nickname },
  })
}

export function getMe() {
  return request<import('./types').AuthUser>('/auth/me')
}

export function generatePlan(weekStart?: string) {
  return request<import('./types').WeekPlan>('/plans/generate', {
    method: 'POST',
    data: weekStart ? { weekStart } : {},
  })
}

export function getDayPlan(date: string) {
  return request<import('./types').DayPlanView>(`/plans/day/${date}`)
}

export function confirmDayPlan(date: string) {
  return request<import('./types').DayPlanView>(`/plans/day/${date}/confirm`, {
    method: 'POST',
    data: {},
  })
}

export function regenerateDayPlan(date: string) {
  return request<import('./types').WeekPlan>(`/plans/day/${date}/regenerate`, {
    method: 'POST',
    data: {},
  })
}

export function rerollItem(planId: string, itemId: string) {
  return request<import('./types').WeekPlan>(`/plans/${planId}/items/${itemId}/reroll`, {
    method: 'POST',
    data: {},
  })
}

export function getMenuHistory(limit = 30) {
  return request<import('./types').MenuHistoryEntry[]>(`/plans/history?limit=${limit}`)
}

export function getMenuHistoryDetail(date: string) {
  return request<import('./types').MenuHistoryDetail>(`/plans/history/${date}`)
}

export function getPreferences() {
  return request<import('./types').UserPreference>('/preferences')
}

export function updatePreferences(payload: import('./types').UpdatePreferencePayload) {
  return request<import('./types').UserPreference>('/preferences', {
    method: 'POST',
    data: payload,
  })
}

export function submitFeedback(
  recipeId: string,
  payload: { rating: number; comment?: string },
) {
  return request(`/recipes/${recipeId}/feedback`, {
    method: 'POST',
    data: payload,
  })
}
