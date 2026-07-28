import type { DayMeals, MealGroup, PlanItem, WeekPlan } from '../types'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const emptyMealGroup = (): MealGroup => ({ dishes: [], soups: [] })

export function todayDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function mondayOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayDate()
}

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
      map.set(item.serveDate, {
        date: item.serveDate,
        weekday,
        lunch: emptyMealGroup(),
        dinner: emptyMealGroup(),
      })
    }
    const day = map.get(item.serveDate)!
    const group = item.mealSlot === 'lunch' ? day.lunch : day.dinner
    if (item.dishType === 'soup') {
      group.soups.push(item)
    } else {
      group.dishes.push(item)
    }
  }

  const sortItems = (a: PlanItem, b: PlanItem) =>
    (a.slotIndex ?? 0) - (b.slotIndex ?? 0)

  for (const day of map.values()) {
    day.lunch.dishes.sort(sortItems)
    day.lunch.soups.sort(sortItems)
    day.dinner.dishes.sort(sortItems)
    day.dinner.soups.sort(sortItems)
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function groupItemsToDay(date: string, items: PlanItem[]): DayMeals {
  const d = new Date(`${date}T00:00:00`)
  const weekday = WEEKDAYS[(d.getDay() + 6) % 7]
  const day: DayMeals = {
    date,
    weekday,
    lunch: emptyMealGroup(),
    dinner: emptyMealGroup(),
  }

  for (const item of items) {
    const group = item.mealSlot === 'lunch' ? day.lunch : day.dinner
    if (item.dishType === 'soup') {
      group.soups.push(item)
    } else {
      group.dishes.push(item)
    }
  }

  const sortItems = (a: PlanItem, b: PlanItem) =>
    (a.slotIndex ?? 0) - (b.slotIndex ?? 0)

  day.lunch.dishes.sort(sortItems)
  day.lunch.soups.sort(sortItems)
  day.dinner.dishes.sort(sortItems)
  day.dinner.soups.sort(sortItems)

  return day
}

export function mealLabel(slot: PlanItem['mealSlot']) {
  return slot === 'lunch' ? '午餐' : '晚餐'
}

export function dishTypeLabel(type: PlanItem['dishType']) {
  return type === 'soup' ? '汤' : '菜'
}
