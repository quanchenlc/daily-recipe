import type { DayMeals, MenuHistorySnapshotItem, PlanItem } from '../types'
import { groupItemsToDay } from './date'

export function snapshotToDayMeals(
  date: string,
  items: MenuHistorySnapshotItem[],
): DayMeals {
  const pseudoItems: PlanItem[] = items.map((item, index) => ({
    id: `history-${date}-${index}`,
    planId: 'history',
    recipeId: 'history',
    recipe: {
      id: 'history',
      name: item.recipeName,
      description: null,
      ingredients: null,
      tags: item.tags ?? null,
      cookMinutes: item.cookMinutes ?? null,
      difficulty: null,
      source: 'history',
    },
    serveDate: date,
    mealSlot: item.mealSlot,
    dishType: item.dishType,
    dishCategory: item.dishCategory,
    slotIndex: item.slotIndex,
    reason: null,
  }))

  return groupItemsToDay(date, pseudoItems)
}

export function formatConfirmedAt(iso: string): string {
  const date = new Date(iso)
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}
