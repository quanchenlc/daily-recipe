export type MealSlot = 'lunch' | 'dinner'
export type DishType = 'dish' | 'soup'
export type DishCategory = 'meat' | 'vegetable' | 'soup'

export interface MealSlotConfig {
  meatDishes: number
  vegetableDishes: number
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
  dishCategory: DishCategory
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
  weekStatus: string | null
  hasMenu: boolean
  confirmed: boolean
  confirmedAt: string | null
  items: PlanItem[]
}

export interface MenuHistoryEntry {
  date: string
  confirmedAt: string
  dishCount: number
  preview: string[]
}

export interface MenuHistoryDetail {
  date: string
  confirmedAt: string
  items: Array<{
    recipeName: string
    mealSlot: MealSlot
    dishType: DishType
    dishCategory: DishCategory
    slotIndex: number
    tags?: string[] | null
    cookMinutes?: number | null
  }>
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

export interface UpdatePreferencePayload {
  adultsCount?: number
  elderlyCount?: number
  childrenCount?: number
  flavorNotes?: string
  mealConfig?: MealConfig
}

export interface AuthUser {
  id: string
  nickname: string | null
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: string
  user: AuthUser
}
