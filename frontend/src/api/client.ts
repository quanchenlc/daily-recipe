import type { UserPreference, WeekPlan } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
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

export function getCurrentPlan() {
  return request<WeekPlan>('/plans/current')
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
