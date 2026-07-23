import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/** A numbering sequence for a document type (e.g. "quote"), optionally
 * scoped to a branch. `branchId` null means the tenant-wide default series
 * for that document type. `nextNumber` is consumed and incremented
 * atomically by DocumentSeriesService.consumeNext(). Uniqueness of
 * (tenantId, documentType, branchId) — including the branchId-null case —
 * is enforced by two partial unique indexes created directly in the
 * migration, since a plain composite unique index treats NULL branchId as
 * distinct every time in Postgres. */
@Entity('org_document_series')
export class DocumentSeries extends TenantScopedEntity {
  @Column({ name: 'document_type' })
  documentType: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column()
  prefix: string;

  @Column({ name: 'next_number', type: 'int', default: 1 })
  nextNumber: number;

  @Column({ type: 'int', default: 6 })
  padding: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
