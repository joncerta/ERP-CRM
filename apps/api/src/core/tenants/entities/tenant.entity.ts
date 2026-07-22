import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ name: 'default_locale', default: 'es' })
  defaultLocale: string;

  @Column({ name: 'default_currency_code', default: 'USD' })
  defaultCurrencyCode: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Minutes of inactivity before a session is force-expired. Null = no idle timeout (JWT expiry still applies). */
  @Column({ name: 'session_idle_timeout_minutes', type: 'int', nullable: true })
  sessionIdleTimeoutMinutes: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
