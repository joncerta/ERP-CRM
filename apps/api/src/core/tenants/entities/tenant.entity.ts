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

  /** Brand colors set by the platform admin. Null = use the app's default palette. */
  @Column({ name: 'branding_primary_color', type: 'varchar', nullable: true })
  brandingPrimaryColor: string | null;

  @Column({ name: 'branding_secondary_color', type: 'varchar', nullable: true })
  brandingSecondaryColor: string | null;

  /** Logo as a base64 data URI (e.g. "data:image/png;base64,..."). Stored
   * directly in the row rather than on disk since the app containers are
   * ephemeral in production. Null = no custom logo, fall back to the
   * default letter mark. */
  @Column({ name: 'branding_logo_data', type: 'text', nullable: true })
  brandingLogoData: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
