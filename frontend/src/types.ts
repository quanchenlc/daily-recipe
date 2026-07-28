export type MealSlot = 'lunch' | 'dinner'
export type DishType = 'dish' | 'soup'

export interface MealSlotConfig {
  dishes: number
  soups: number
}

export interface MealConfig {
  lunch: MealSlotConfig
  dinner: MealSlotConfig
}

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
  dishType: DishType
  slotIndex: number
  reason: string | null
}

export interface WeekPlan {
  id: string
  weekStart: string
  status: string
  items: PlanItem[]
}

export interface DayPlanView {
  date: string
  weekStart: string
  planId: string | null
  hasMenu: boolean
  confirmed: boolean
  confirmedAt: string | null
  items: PlanItem[]
}

export interface UserPreference {
  id: string
  likes: string[] | null
  dislikes: string[] | null
  constraints: string[] | null
  summaryText: string | null
  adultsCount: number
  elderlyCount: number
  childrenCount: number
  flavorNotes: string | null
  mealConfig: MealConfig | null
}

export interface MealGroup {
  dishes: PlanItem[]
  soups: PlanItem[]
}

export interface DayMeals {
  date: string
  weekday: string
  lunch: MealGroup
  dinner: MealGroup
}

export interface UpdatePreferencePayload {
  adultsCount?: number
  elderlyCount?: number
  childrenCount?: number
  flavorNotes?: string
  mealConfig?: MealConfig
}
