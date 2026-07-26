export type MealSlot = 'lunch' | 'dinner'

export interface Recipe {
  id: string
  name: string
  description: string | null
  ingredients: string[] | null
  tags: string[] | null
  cookMinutes: number | null
  difficulty: string | null
  source: string
}

export interface PlanItem {
  id: string
  planId: string
  recipeId: string
  recipe: Recipe
  serveDate: string
  mealSlot: MealSlot
  reason: string | null
}

export interface WeekPlan {
  id: string
  weekStart: string
  status: string
  items: PlanItem[]
}

export interface UserPreference {
  id: string
  likes: string[] | null
  dislikes: string[] | null
  constraints: string[] | null
  summaryText: string | null
}

export interface DayMeals {
  date: string
  weekday: string
  lunch?: PlanItem
  dinner?: PlanItem
}
