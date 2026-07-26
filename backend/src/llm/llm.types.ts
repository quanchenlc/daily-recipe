export type MealSlot = 'lunch' | 'dinner';
export type DishType = 'dish' | 'soup';

export interface LlmMenuItem {
  date: string;
  mealSlot: MealSlot;
  dishType: DishType;
  slotIndex?: number;
  recipeName: string;
  reason?: string;
  description?: string;
  ingredients?: string[];
  tags?: string[];
  cookMinutes?: number;
  difficulty?: string;
}

export interface LlmMenuResult {
  weekStart: string;
  items: LlmMenuItem[];
}

import { MealConfig } from '../preferences/preference.types';

export interface RecommendContext {
  weekStart: string;
  days: number;
  mealSlots: MealSlot[];
  mealConfig: MealConfig;
  familyComposition: {
    adults: number;
    elderly: number;
    children: number;
  };
  flavorNotes?: string;
  blockedRecipeNames: string[];
  knownRecipes: Array<{
    name: string;
    tags?: string[] | null;
    cookMinutes?: number | null;
  }>;
  preferenceSummary: string;
  likes: string[];
  dislikes: string[];
  constraints: string[];
  extraNote?: string;
  /** When rerolling a single slot */
  target?: {
    date: string;
    mealSlot: MealSlot;
    dishType: DishType;
    slotIndex: number;
    avoidNames: string[];
  };
}
