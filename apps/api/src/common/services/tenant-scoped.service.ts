import { NotFoundException } from '@nestjs/common';
import { Brackets, FindOptionsWhere, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { TenantScopedEntity } from '../entities/tenant-scoped.entity';
import { PageQuery, Paginated } from '../pagination/pagination.types';

export interface PaginationOptions<T extends ObjectLiteral> {
  /** Query builder alias for the entity's own table — kept short and explicit at each call site. */
  alias: string;
  /** Columns ILIKE-searched (OR'd together) when `search` is set. Omit to disable text search for this list. */
  searchColumns?: string[];
  /** Whitelist of columns `sortBy` may target — never trust the query param directly as a column name. */
  sortableColumns: string[];
  defaultSortBy: string;
  /** Extra WHERE clauses (status, category, date range, owner...) applied before pagination. */
  applyFilters?: (qb: SelectQueryBuilder<T>) => void;
}

/**
 * Wraps a repository so every call is forced to go through tenantId,
 * making it structurally hard to accidentally leak data across tenants.
 */
export abstract class TenantScopedService<T extends TenantScopedEntity> {
  protected constructor(protected readonly repository: Repository<T>) {}

  async findAllForTenant(tenantId: string, where: FindOptionsWhere<T> = {} as FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.find({
      where: { ...where, tenantId } as FindOptionsWhere<T>,
    });
  }

  /** Same idea as findAllForTenant, but paged, searchable, sortable, and
   * filterable — used by every list screen's grid instead of loading the
   * whole table into the browser and filtering client-side. */
  async findPaginatedForTenant(tenantId: string, query: PageQuery, options: PaginationOptions<T>): Promise<Paginated<T>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 200);
    const { alias } = options;

    const qb = this.repository.createQueryBuilder(alias).where(`${alias}.tenantId = :tenantId`, { tenantId });

    if (query.search && options.searchColumns?.length) {
      const search = `%${query.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          options.searchColumns!.forEach((column, index) => {
            const clause = `${alias}.${column} ILIKE :search`;
            if (index === 0) sub.where(clause, { search });
            else sub.orWhere(clause, { search });
          });
        }),
      );
    }

    options.applyFilters?.(qb);

    const sortBy = options.sortableColumns.includes(query.sortBy ?? '') ? (query.sortBy as string) : options.defaultSortBy;
    qb.orderBy(`${alias}.${sortBy}`, query.sortDir === 'ASC' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findOneForTenant(tenantId: string, id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(`Recurso ${id} no encontrado`);
    }
    return entity;
  }

  async removeForTenant(tenantId: string, id: string): Promise<void> {
    const entity = await this.findOneForTenant(tenantId, id);
    await this.repository.remove(entity);
  }
}
