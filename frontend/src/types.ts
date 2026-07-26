export type MealSlot = 'lunch' | 'dinner'
export type DishType = 'dish' | 'soup'
export type DishCategory = 'meat' | 'vegetable' | 'soup'

export interface MealSlotConfig {
  /** @deprecated migrated to meatDishes + vegetableDishes */
  dishes?: number
  meatDishes: number
  vegetableDishes: number
  soups: number
}

export interface MealConfig {
  lunch: MealSlotConfig
  dinner: MealSlotConfig
}

export function normalizeSlotConfig(raw: Partial<MealSlotConfig>): MealSlotConfig {
  if (raw.meatDishes !== undefined || raw.vegetableDishes !== undefined) {
    return {
      meatDishes: raw.meatDishes ?? 0,
      vegetableDishes: raw.vegetableDishes ?? 0,
      soups: raw.soups ?? 0,
    }
  }
  const dishes = raw.dishes ?? 2
  const veg = dishes <= 1 ? 0 : Math.max(1, Math.min(dishes - 1, Math.round(dishes / 3)))
  return {
    meatDishes: Math.max(0, dishes - veg),
    vegetableDishes: veg,
    soups: raw.soups ?? 1,
  }
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
