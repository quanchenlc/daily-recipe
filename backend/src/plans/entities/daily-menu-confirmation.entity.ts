import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WeekPlan } from './week-plan.entity';

@Entity('daily_menu_confirmations')
export class DailyMenuConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', name: 'serve_date', unique: true })
  serveDate: string;

  @Column({ type: 'varchar', length: 36, name: 'plan_id' })
  planId: string;

  @ManyToOne(() => WeekPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: WeekPlan;

  @CreateDateColumn({ name: 'confirmed_at' })
  confirmedAt: Date;
}
