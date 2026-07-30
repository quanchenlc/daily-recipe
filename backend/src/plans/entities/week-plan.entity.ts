import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanItem } from './plan-item.entity';

@Entity('week_plans')
@Index(['userId', 'weekStart'], { unique: true })
export class WeekPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'date', name: 'week_start' })
  weekStart: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @OneToMany(() => PlanItem, (item) => item.plan, { cascade: true })
  items: PlanItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
