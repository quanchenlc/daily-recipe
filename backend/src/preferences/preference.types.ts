export interface MealSlotConfig {
  /** @deprecated legacy field, migrated on read */
  dishes?: number;
  meatDishes: number;
  vegetableDishes: number;
  soups: number;
}

export interface MealConfig {
  lunch: MealSlotConfig;
  dinner: MealSlotConfig;
}

export const DEFAULT_MEAL_CONFIG: MealConfig = {
  lunch: { meatDishes: 1, vegetableDishes: 1, soups: 1 },
  dinner: { meatDishes: 2, vegetableDishes: 1, soups: 1 },
};

export type DishCategory = 'meat' | 'vegetable' | 'soup';

export function normalizeSlotConfig(
  raw: Partial<MealSlotConfig> | null | undefined,
): MealSlotConfig {
  if (!raw) {
    return { meatDishes: 1, vegetableDishes: 1, soups: 1 };
  }

  if (raw.meatDishes !== undefined || raw.vegetableDishes !== undefined) {
    const meat = clamp(raw.meatDishes ?? 0, 0, 6);
    const veg = clamp(raw.vegetableDishes ?? 0, 0, 6);
    return {
      meatDishes: meat,
      vegetableDishes: veg,
      soups: clamp(raw.soups ?? 0, 0, 4),
    };
  }

  const dishes = clamp(raw.dishes ?? 2, 0, 6);
  const veg =
    dishes <= 1 ? 0 : Math.max(1, Math.min(dishes - 1, Math.round(dishes / 3)));
  return {
    meatDishes: Math.max(0, dishes - veg),
    vegetableDishes: veg,
    soups: clamp(raw.soups ?? 1, 0, 4),
  };
}

export function normalizeMealConfig(
  config: Partial<MealConfig> | null | undefined,
): MealConfig {
  return {
    lunch: normalizeSlotConfig(config?.lunch),
    dinner: normalizeSlotConfig(config?.dinner),
  };
}

export function slotDishCount(cfg: MealSlotConfig): number {
  return cfg.meatDishes + cfg.vegetableDishes;
}

export function itemsPerDay(config: MealConfig): number {
  return (
    slotDishCount(config.lunch) +
    config.lunch.soups +
    slotDishCount(config.dinner) +
    config.dinner.soups
  );
}

export function totalItemsForWeek(days: number, config: MealConfig): number {
  return days * itemsPerDay(config);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
