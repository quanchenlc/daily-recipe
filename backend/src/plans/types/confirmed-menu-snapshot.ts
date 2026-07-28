import type { DishCategory, DishType, MealSlot } from '../../llm/llm.types';

export interface ConfirmedMenuSnapshotItem {
  recipeName: string;
  mealSlot: MealSlot;
  dishType: DishType;
  dishCategory: DishCategory;
  slotIndex: number;
  tags?: string[] | null;
  cookMinutes?: number | null;
}
