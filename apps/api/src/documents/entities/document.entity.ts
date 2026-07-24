import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum DocumentCategory {
  CONTRACT = 'contract',
  PRESENTATION = 'presentation',
  PHOTO = 'photo',
  OTHER = 'other',
}

/** File content stored as a base64 data URI directly on the row — same
 * pattern as Tenant.brandingLogoData, since this project has no object
 * storage (S3, etc.) configured and containers here are ephemeral. A
 * higher size cap than the logo's (documents are naturally bigger than a
 * logo) but still capped so nobody stuffs a huge file into Postgres. */
@Entity('documents')
export class Document extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: DocumentCategory, default: DocumentCategory.OTHER })
  category: DocumentCategory;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'file_data', type: 'text' })
  fileData: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Index()
  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string | null;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  uploadedByUserId: string;
}
