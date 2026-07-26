import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Feedback } from './feedback.entity';
import { PlanItem } from '../../plans/entities/plan-item.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  ingredients: string[] | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ type: 'int', nullable: true, name: 'cook_minutes' })
  cookMinutes: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  difficulty: string | null;

  @Column({ type: 'varchar', length: 32, default: 'llm' })
  source: string;

  @OneToMany(() => Feedback, (feedback) => feedback.recipe)
  feedbacks: Feedback[];

  @OneToMany(() => PlanItem, (item) => item.recipe)
  planItems: PlanItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
