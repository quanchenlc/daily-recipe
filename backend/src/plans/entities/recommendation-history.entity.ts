import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recipe } from '../../recipes/entities/recipe.entity';

@Entity('recommendation_histories')
export class RecommendationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, name: 'recipe_id' })
  recipeId: string;

  @ManyToOne(() => Recipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Index()
  @Column({ type: 'date', name: 'serve_date' })
  serveDate: string;

  @Column({ type: 'varchar', length: 16, name: 'meal_slot' })
  mealSlot: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
