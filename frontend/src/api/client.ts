import type { DayPlanView, UpdatePreferencePayload, UserPreference, WeekPlan } from '../types'

/** Local dev uses Vite proxy `/api`. Production uses absolute API origin. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
) ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join('；')
      else if (body.message) message = body.message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function getHealth() {
  return request<{ ok: boolean }>('/health')
}

export function generatePlan(weekStart?: string) {
  return request<WeekPlan>('/plans/generate', {
    method: 'POST',
    body: JSON.stringify(weekStart ? { weekStart } : {}),
  })
}

export function getCurrentPlan(weekStart?: string) {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ''
  return request<WeekPlan>(`/plans/current${query}`)
}

export function getDayPlan(date: string) {
  return request<DayPlanView>(`/plans/day/${date}`)
}

export function confirmDayPlan(date: string) {
  return request<DayPlanView>(`/plans/day/${date}/confirm`, {
    method: 'POST',
    body: '{}',
  })
}

export function rerollItem(planId: string, itemId: string) {
  return request<WeekPlan>(`/plans/${planId}/items/${itemId}/reroll`, {
    method: 'POST',
    body: '{}',
  })
}

export function submitFeedback(
  recipeId: string,
  payload: { rating: number; comment?: string },
) {
  return request(`/recipes/${recipeId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPreferences() {
  return request<UserPreference>('/preferences')
}

export function updatePreferences(payload: UpdatePreferencePayload) {
  return request<UserPreference>('/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).catch(async (error) => {
    if (error instanceof Error && error.message.includes('404')) {
      return request<UserPreference>('/preferences', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }
    throw error
  })
}
