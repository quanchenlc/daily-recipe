import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WeekPlan } from './week-plan.entity';
import type { ConfirmedMenuSnapshotItem } from '../types/confirmed-menu-snapshot';

@Entity('daily_menu_confirmations')
export class DailyMenuConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', name: 'serve_date', unique: true })
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
