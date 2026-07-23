import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DocumentSeries } from './entities/document-series.entity';
import { CreateDocumentSeriesDto } from './dto/create-document-series.dto';
import { UpdateDocumentSeriesDto } from './dto/update-document-series.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

const DEFAULT_PREFIXES: Record<string, string> = {
  quote: 'COT',
};

@Injectable()
export class DocumentSeriesService extends TenantScopedService<DocumentSeries> {
  constructor(@InjectRepository(DocumentSeries) repo: Repository<DocumentSeries>) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<DocumentSeries>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'series',
      sortableColumns: ['documentType', 'prefix', 'nextNumber', 'createdAt'],
      defaultSortBy: 'documentType',
    });
  }

  async create(tenantId: string, dto: CreateDocumentSeriesDto): Promise<DocumentSeries> {
    const existing = await this.repository.findOne({
      where: { tenantId, documentType: dto.documentType, branchId: dto.branchId ?? IsNull() },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una serie para ese tipo de documento y sucursal');
    }
    const series = this.repository.create({
      tenantId,
      documentType: dto.documentType,
      branchId: dto.branchId ?? null,
      prefix: dto.prefix,
      nextNumber: dto.nextNumber ?? 1,
      padding: dto.padding ?? 6,
    });
    return this.repository.save(series);
  }

  async update(tenantId: string, id: string, dto: UpdateDocumentSeriesDto): Promise<DocumentSeries> {
    const series = await this.findOneForTenant(tenantId, id);
    Object.assign(series, dto);
    return this.repository.save(series);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const series = await this.findOneForTenant(tenantId, id);
    await this.repository.remove(series);
  }

  /** Atomically claims the next number in a document type's series,
   * auto-provisioning the tenant-wide default series (branchId null) on
   * first use. Falls back from a branch-specific series to the tenant-wide
   * one when the branch doesn't have its own. */
  async consumeNext(tenantId: string, documentType: string, branchId: string | null = null): Promise<string> {
    return this.repository.manager.transaction(async (manager) => {
      const seriesRepo = manager.getRepository(DocumentSeries);
      let series = branchId
        ? await seriesRepo.findOne({ where: { tenantId, documentType, branchId } })
        : null;
      if (!series) {
        series = await seriesRepo.findOne({ where: { tenantId, documentType, branchId: IsNull() } });
      }
      if (!series) {
        series = seriesRepo.create({
          tenantId,
          documentType,
          branchId: null,
          prefix: DEFAULT_PREFIXES[documentType] ?? documentType.slice(0, 3).toUpperCase(),
          nextNumber: 1,
          padding: 6,
        });
      }
      const current = series.nextNumber;
      series.nextNumber = current + 1;
      await seriesRepo.save(series);
      return `${series.prefix}-${String(current).padStart(series.padding, '0')}`;
    });
  }
}
