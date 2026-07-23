import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'typeorm';

export type AuditAction = 'create' | 'update' | 'delete';

/** One row per change to any tenant-scoped entity in the system — who did
 * what, to what, and when. Written exclusively by AuditSubscriber, never
 * by application code directly, so coverage stays automatic as new
 * entities are added instead of relying on every service remembering to
 * log itself. */
@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'entityType', 'entityId'])
export class AuditLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column()
  action: AuditAction;

  /** Null for changes made outside a request (migrations, seeds) — there's
   * no "who" to blame for those. */
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  /** { fieldName: { before, after } } for updates; full field snapshot for
   * create/delete. Kept generic on purpose — every entity shape is different. */
  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, { before: unknown; after: unknown }> | Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
