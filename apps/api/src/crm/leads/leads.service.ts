import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class LeadsService extends TenantScopedService<Lead> {
  constructor(@InjectRepository(Lead) repo: Repository<Lead>) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListLeadsQueryDto): Promise<Paginated<Lead>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'lead',
      searchColumns: ['name', 'source'],
      sortableColumns: ['name', 'status', 'estimatedBudget', 'createdAt'],
      defaultSortBy: 'createdAt',
      applyFilters: (qb) => {
        if (query.status) qb.andWhere('lead.status = :status', { status: query.status });
        if (query.ownerUserId) qb.andWhere('lead.ownerUserId = :ownerUserId', { ownerUserId: query.ownerUserId });
      },
    });
  }

  create(tenantId: string, dto: CreateLeadDto): Promise<Lead> {
    const lead = this.repository.create({ ...dto, tenantId });
    return this.repository.save(lead);
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOneForTenant(tenantId, id);
    Object.assign(lead, dto);
    return this.repository.save(lead);
  }

  async markConverted(tenantId: string, id: string): Promise<Lead> {
    const lead = await this.findOneForTenant(tenantId, id);
    lead.status = LeadStatus.CONVERTED;
    return this.repository.save(lead);
  }
}
