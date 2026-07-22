import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/**
 * One row per active login. Its id is embedded in the JWT as `sid` so every
 * authenticated request can be checked against it — that's what makes
 * single-session enforcement and server-side logout possible with an
 * otherwise stateless JWT (a bare JWT can't be revoked before it expires).
 */
@Entity('sessions')
export class Session extends TenantScopedEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_reason', type: 'varchar', nullable: true })
  revokedReason: string | null;
}
