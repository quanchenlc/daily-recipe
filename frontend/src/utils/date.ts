import type { DayMeals, PlanItem, WeekPlan } from '../types'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function formatMonthDay(dateStr: string) {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}月${Number(d)}日`
}

export function groupPlanByDay(plan: WeekPlan): DayMeals[] {
  const map = new Map<string, DayMeals>()

  for (const item of plan.items) {
    if (!map.has(item.serveDate)) {
      const date = new Date(`${item.serveDate}T00:00:00`)
      const weekday = WEEKDAYS[(date.getDay() + 6) % 7]
      map.set(item.serveDate, { date: item.serveDate, weekday })
    }
    const day = map.get(item.serveDate)!
    if (item.mealSlot === 'lunch') day.lunch = item
    if (item.mealSlot === 'dinner') day.dinner = item
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function mealLabel(slot: PlanItem['mealSlot']) {
  return slot === 'lunch' ? '午餐' : '晚餐'
}
