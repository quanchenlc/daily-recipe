export type MealSlot = 'lunch' | 'dinner';

export interface LlmMenuItem {
  date: string;
  mealSlot: MealSlot;
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

export interface RecommendContext {
  weekStart: string;
  days: number;
  mealSlots: MealSlot[];
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
    avoidNames: string[];
  };
}
