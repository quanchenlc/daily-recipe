import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WeekPlan } from './week-plan.entity';
import type { ConfirmedMenuSnapshotItem } from '../types/confirmed-menu-snapshot';

@Entity('daily_menu_confirmations')
@Index(['userId', 'serveDate'], { unique: true })
export class DailyMenuConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'date', name: 'serve_date' })
  serveDate: string;

  @Column({ type: 'varchar', length: 36, name: 'plan_id', nullable: true })
  planId: string | null;

  @ManyToOne(() => WeekPlan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: WeekPlan | null;

  @Column({ type: 'json', nullable: true })
  snapshot: ConfirmedMenuSnapshotItem[] | null;

  @CreateDateColumn({ name: 'confirmed_at' })
  confirmedAt: Date;
}
