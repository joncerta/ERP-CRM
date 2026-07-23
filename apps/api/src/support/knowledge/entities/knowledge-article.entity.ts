import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('support_knowledge_articles')
@Index(['tenantId', 'slug'], { unique: true })
export class KnowledgeArticle extends TenantScopedEntity {
  @Column()
  title: string;

  @Column()
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;
}
