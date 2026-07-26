import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Single-user MVP: always one row with key "default". */
  @Column({ type: 'varchar', length: 64, unique: true, default: 'default' })
  key: string;

  @Column({ type: 'json', nullable: true })
  likes: string[] | null;

  @Column({ type: 'json', nullable: true })
  dislikes: string[] | null;

  @Column({ type: 'json', nullable: true })
  constraints: string[] | null;

  @Column({ type: 'text', nullable: true, name: 'summary_text' })
  summaryText: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
