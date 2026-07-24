import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

/** Everything a public API key is allowed to touch — deliberately a
 * short curated list, not a mirror of the internal permission system.
 * Public keys reach a small, explicit surface (see PublicApiController),
 * never the full internal API. */
export const PUBLIC_API_SCOPES = ['leads:read', 'leads:write', 'contacts:read', 'contacts:write', 'invoices:read'] as const;
export type PublicApiScope = (typeof PUBLIC_API_SCOPES)[number];

/** keyHash is a sha256 digest of the plaintext key — plenty for a
 * high-entropy random token (unlike a user password, no slow KDF needed).
 * The plaintext is only ever returned once, from create(); keyPrefix is
 * what the UI shows afterward so an admin can tell keys apart without
 * ever seeing the secret again. */
@Entity('api_keys')
export class ApiKey extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ name: 'key_prefix' })
  keyPrefix: string;

  @Index({ unique: true })
  @Column({ name: 'key_hash', select: false })
  keyHash: string;

  @Column({ type: 'simple-array' })
  scopes: PublicApiScope[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;
}
