import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { WeekPlan } from './week-plan.entity';

export type MealSlot = 'lunch' | 'dinner';
export type DishType = 'dish' | 'soup';

@Entity('plan_items')
export class PlanItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'plan_id' })
  planId: string;

  @ManyToOne(() => WeekPlan, (plan) => plan.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: WeekPlan;

  @Column({ type: 'varchar', length: 36, name: 'recipe_id' })
  recipeId: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.planItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ type: 'date', name: 'serve_date' })
  serveDate: string;

  @Column({ type: 'varchar', length: 16, name: 'meal_slot' })
  mealSlot: MealSlot;

  @Column({ type: 'varchar', length: 16, name: 'dish_type', default: 'dish' })
  dishType: DishType;

  @Column({ type: 'int', name: 'slot_index', default: 0 })
  slotIndex: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
