import { computed, ref } from 'vue'
import {
  generatePlan,
  getCurrentPlan,
  getPreferences,
  rerollItem,
  submitFeedback,
  updatePreferences,
} from '../api/client'
import type { PlanItem, UpdatePreferencePayload, UserPreference, WeekPlan } from '../types'
import { groupPlanByDay } from '../utils/date'

export function useWeekPlan() {
  const plan = ref<WeekPlan | null>(null)
  const preference = ref<UserPreference | null>(null)
  const loading = ref(false)
  const savingPrefs = ref(false)
  const busyKey = ref<string | null>(null)
  const error = ref('')
  const notice = ref('')

  const days = computed(() => (plan.value ? groupPlanByDay(plan.value) : []))

  async function refreshPreferences() {
    preference.value = await getPreferences()
  }

  async function loadCurrent() {
    loading.value = true
    error.value = ''
    try {
      plan.value = await getCurrentPlan()
      await refreshPreferences()
      notice.value = '已加载本周菜单'
    } catch (e) {
      plan.value = null
      const message = e instanceof Error ? e.message : '加载失败'
      if (message.includes('还没有菜单') || message.includes('Not Found')) {
        notice.value = '本周还没有菜单，点上方按钮生成即可'
        try {
          await refreshPreferences()
        } catch {
          // ignore
        }
      } else {
        error.value = message
      }
    } finally {
      loading.value = false
    }
  }

  async function generate() {
    loading.value = true
    error.value = ''
    notice.value = ''
    try {
      plan.value = await generatePlan()
      await refreshPreferences()
      notice.value = '本周菜单已生成'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败'
    } finally {
      loading.value = false
    }
  }

  async function savePreferences(payload: UpdatePreferencePayload) {
    savingPrefs.value = true
    error.value = ''
    try {
      preference.value = await updatePreferences(payload)
      notice.value = '偏好已保存，重新生成菜单会按新设置推荐'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败'
      throw e
    } finally {
      savingPrefs.value = false
    }
  }

  async function reroll(item: PlanItem) {
    if (!plan.value) return
    busyKey.value = `reroll-${item.id}`
    error.value = ''
    try {
      plan.value = await rerollItem(plan.value.id, item.id)
      const kind = item.dishType === 'soup' ? '汤' : '菜'
      notice.value = `已更换：${item.serveDate} ${item.mealSlot === 'lunch' ? '午餐' : '晚餐'}的${kind}`
    } catch (e) {
      error.value = e instanceof Error ? e.message : '换菜失败'
    } finally {
      busyKey.value = null
    }
  }

  async function feedback(
    item: PlanItem,
    rating: number,
    comment: string,
  ) {
    busyKey.value = `feedback-${item.id}`
    error.value = ''
    try {
      await submitFeedback(item.recipe.id, {
        rating,
        comment: comment.trim() || undefined,
      })
      await refreshPreferences()
      notice.value = `已记住你对「${item.recipe.name}」的评价`
    } catch (e) {
      error.value = e instanceof Error ? e.message : '点评失败'
      throw e
    } finally {
      busyKey.value = null
    }
  }

  return {
    plan,
    preference,
    days,
    loading,
    savingPrefs,
    busyKey,
    error,
    notice,
    loadCurrent,
    generate,
    savePreferences,
    reroll,
    feedback,
  }
}
