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
import { groupItemsToDay, isToday, mondayOfWeek, todayDate } from '../utils/date'

export function useWeekPlan() {
  const selectedDate = ref(todayDate())
  const dayPlan = ref<DayPlanView | null>(null)
  const plan = ref<WeekPlan | null>(null)
  const preference = ref<UserPreference | null>(null)
  const loading = ref(false)
  const confirming = ref(false)
  const savingPrefs = ref(false)
  const busyKey = ref<string | null>(null)
  const error = ref('')
  const notice = ref('')

  const hasMenu = computed(() => dayPlan.value?.hasMenu ?? false)
  const isSelectedToday = computed(() => isToday(selectedDate.value))
  const isConfirmed = computed(() => dayPlan.value?.confirmed ?? false)

  const selectedDay = computed(() => {
    if (!dayPlan.value?.hasMenu) return null
    return groupItemsToDay(dayPlan.value.date, dayPlan.value.items)
  })

  const days = computed(() => (selectedDay.value ? [selectedDay.value] : []))

  async function refreshPreferences() {
    preference.value = await getPreferences()
  }

  async function loadForDate(date: string = selectedDate.value) {
    selectedDate.value = date
    loading.value = true
    error.value = ''
    try {
      dayPlan.value = await getDayPlan(date)
      if (dayPlan.value.planId) {
        plan.value = await getCurrentPlan(dayPlan.value.weekStart)
      } else {
        plan.value = null
      }
      await refreshPreferences()
      if (dayPlan.value.hasMenu) {
        notice.value = `已加载 ${date} 的菜单`
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
      const weekStart = mondayOfWeek(selectedDate.value)
      plan.value = await generatePlan(weekStart)
      dayPlan.value = await getDayPlan(selectedDate.value)
      await refreshPreferences()
      notice.value = dayPlan.value.hasMenu
        ? `${selectedDate.value} 的菜单已就绪`
        : '本周菜单已生成，所选日期暂无菜品'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败'
    } finally {
      loading.value = false
    }
  }

  async function confirmMenu() {
    if (!isSelectedToday.value) return
    confirming.value = true
    error.value = ''
    try {
      dayPlan.value = await confirmDayPlan(selectedDate.value)
      notice.value = '已确认并设为今日菜单'
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
    dayPlan,
    plan,
    preference,
    days,
    selectedDay,
    hasMenu,
    isSelectedToday,
    isConfirmed,
    loading,
    confirming,
    savingPrefs,
    busyKey,
    error,
    notice,
    loadForDate,
    generate,
    confirmMenu,
    savePreferences,
    reroll,
    feedback,
  }
}
