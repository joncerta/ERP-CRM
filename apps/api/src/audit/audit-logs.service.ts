import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogFilters {
  actorUserId?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditLogsService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async findAllForTenant(tenantId: string, filters: AuditLogFilters = {}): Promise<Paginated<AuditLog>> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 200);

    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.actorUserId) qb.andWhere('log.actorUserId = :actorUserId', { actorUserId: filters.actorUserId });
    if (filters.entityType) qb.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    if (filters.from) qb.andWhere('log.createdAt >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('log.createdAt <= :to', { to: filters.to });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  distinctEntityTypes(tenantId: string): Promise<string[]> {
    return this.repo
      .createQueryBuilder('log')
      .select('DISTINCT log.entityType', 'entityType')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.entityType', 'ASC')
      .getRawMany()
      .then((rows) => rows.map((r) => r.entityType));
  }
}
