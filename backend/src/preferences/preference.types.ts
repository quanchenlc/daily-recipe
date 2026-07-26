export interface MealSlotConfig {
  dishes: number;
  soups: number;
}

export interface MealConfig {
  lunch: MealSlotConfig;
  dinner: MealSlotConfig;
}

export const DEFAULT_MEAL_CONFIG: MealConfig = {
  lunch: { dishes: 2, soups: 1 },
  dinner: { dishes: 3, soups: 1 },
};

export function itemsPerDay(config: MealConfig): number {
  return (
    config.lunch.dishes +
    config.lunch.soups +
    config.dinner.dishes +
    config.dinner.soups
  );
}

export function totalItemsForWeek(days: number, config: MealConfig): number {
  return days * itemsPerDay(config);
}
