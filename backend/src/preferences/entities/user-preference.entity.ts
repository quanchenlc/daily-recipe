import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MealConfig } from '../preference.types';

@Entity('user_preferences')
@Index(['userId'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'json', nullable: true })
  likes: string[] | null;

  @Column({ type: 'json', nullable: true })
  dislikes: string[] | null;

  @Column({ type: 'json', nullable: true })
  constraints: string[] | null;

  @Column({ type: 'text', nullable: true, name: 'summary_text' })
  summaryText: string | null;

  @Column({ type: 'int', name: 'adults_count', default: 2 })
  adultsCount: number;

  @Column({ type: 'int', name: 'elderly_count', default: 0 })
  elderlyCount: number;

  @Column({ type: 'int', name: 'children_count', default: 0 })
  childrenCount: number;

  @Column({ type: 'text', nullable: true, name: 'flavor_notes' })
  flavorNotes: string | null;

  @Column({ type: 'json', nullable: true, name: 'meal_config' })
  mealConfig: MealConfig | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
