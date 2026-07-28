import { computed, ref } from 'vue'
import {
  confirmDayPlan,
  generatePlan,
  getDayPlan,
  getCurrentPlan,
  getPreferences,
  rerollItem,
  submitFeedback,
  updatePreferences,
} from '../api/client'
import type {
  DayPlanView,
  PlanItem,
  UpdatePreferencePayload,
  UserPreference,
  WeekPlan,
} from '../types'
import {
  groupItemsToDay,
  groupPlanByDay,
  mondayOfWeek,
  todayDate,
} from '../utils/date'

export type ViewMode = 'day' | 'week'

export function useWeekPlan() {
  const selectedDate = ref(todayDate())
  const viewMode = ref<ViewMode>('day')
  const dayPlan = ref<DayPlanView | null>(null)
  const plan = ref<WeekPlan | null>(null)
  const preference = ref<UserPreference | null>(null)
  const loading = ref(false)
  const confirming = ref(false)
  const savingPrefs = ref(false)
  const busyKey = ref<string | null>(null)
  const error = ref('')
  const notice = ref('')

  const weekStart = computed(() => mondayOfWeek(selectedDate.value))
  const hasMenu = computed(() => dayPlan.value?.hasMenu ?? false)
  const hasWeekPlan = computed(() => Boolean(plan.value?.items.length))
  const isDayConfirmed = computed(() => dayPlan.value?.confirmed ?? false)

  const selectedDay = computed(() => {
    if (!dayPlan.value?.hasMenu) return null
    return groupItemsToDay(dayPlan.value.date, dayPlan.value.items)
  })

  const weekDays = computed(() => (plan.value ? groupPlanByDay(plan.value) : []))

  const days = computed(() => {
    if (viewMode.value === 'week') return weekDays.value
    return selectedDay.value ? [selectedDay.value] : []
  })

  async function refreshPreferences() {
    preference.value = await getPreferences()
  }

  async function syncPlanState(date: string = selectedDate.value) {
    dayPlan.value = await getDayPlan(date)
    if (dayPlan.value.planId) {
      plan.value = await getCurrentPlan(dayPlan.value.weekStart)
    } else {
      plan.value = null
    }
  }

  async function loadForDate(date: string = selectedDate.value) {
    selectedDate.value = date
    loading.value = true
    error.value = ''
    try {
      await syncPlanState(date)
      await refreshPreferences()
      if (dayPlan.value?.hasMenu) {
        notice.value = `已加载 ${date} 的菜单`
      } else if (hasWeekPlan.value) {
        notice.value = '本周已有菜单，换一天查看'
      } else {
        notice.value = '这一天还没有菜单，可生成本周菜单'
      }
    } catch (e) {
      dayPlan.value = null
      plan.value = null
      const message = e instanceof Error ? e.message : '加载失败'
      if (message.includes('还没有菜单') || message.includes('Not Found')) {
        notice.value = '这一天还没有菜单，可生成本周菜单'
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
      const start = weekStart.value
      plan.value = await generatePlan(start)
      dayPlan.value = await getDayPlan(selectedDate.value)
      await refreshPreferences()
      viewMode.value = 'week'
      notice.value = '本周菜单已生成，逐日确认后会收录到历史菜单'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败'
    } finally {
      loading.value = false
    }
  }

  async function confirmDay() {
    if (!hasMenu.value) return
    confirming.value = true
    error.value = ''
    try {
      dayPlan.value = await confirmDayPlan(selectedDate.value)
      notice.value = `已确认 ${selectedDate.value} 的菜单，仍可点「换」调整菜品`
    } catch (e) {
      error.value = e instanceof Error ? e.message : '确认失败'
    } finally {
      confirming.value = false
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
      dayPlan.value = await getDayPlan(selectedDate.value)
      const kind = item.dishType === 'soup' ? '汤' : '菜'
      notice.value = `已更换：${item.mealSlot === 'lunch' ? '午餐' : '晚餐'}的${kind}`
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
    selectedDate,
    viewMode,
    dayPlan,
    plan,
    preference,
    days,
    weekDays,
    selectedDay,
    weekStart,
    hasMenu,
    hasWeekPlan,
    isDayConfirmed,
    loading,
    confirming,
    savingPrefs,
    busyKey,
    error,
    notice,
    loadForDate,
    generate,
    confirmDay,
    savePreferences,
    reroll,
    feedback,
  }
}
