import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base for every entity that belongs to a tenant. tenantId is enforced in
 * application code (see TenantScopedService) — every read/write must filter
 * by it explicitly. The column + index also back the Postgres RLS policies
 * defined in the initial migration for defense-in-depth.
 */
export abstract class TenantScopedEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
