import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { AutomationRulesService } from '../../automations/automation-rules.service';
import { WebhooksService } from '../../automations/webhooks.service';
import { AutomationRuleType } from '../../automations/entities/automation-rule.entity';
import { WebhookEventType } from '../../automations/entities/webhook-subscription.entity';

@Injectable()
export class LeadsService extends TenantScopedService<Lead> {
  constructor(
    @InjectRepository(Lead) repo: Repository<Lead>,
    private readonly automationRulesService: AutomationRulesService,
    private readonly webhooksService: WebhooksService,
  ) {
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

  /** Auto-assignment only kicks in when the caller didn't already pick an
   * owner and an AUTO_ASSIGN_LEAD rule is active — never overrides an
   * explicit choice (e.g. a rep manually logging a lead for themselves). */
  async create(tenantId: string, dto: CreateLeadDto): Promise<Lead> {
    let ownerUserId = dto.ownerUserId ?? null;
    if (!ownerUserId) {
      const rules = await this.automationRulesService.findActiveByType(tenantId, AutomationRuleType.AUTO_ASSIGN_LEAD);
      if (rules.length) ownerUserId = await this.automationRulesService.pickNextOwner(tenantId);
    }
    const lead = this.repository.create({ ...dto, tenantId, ownerUserId: ownerUserId ?? undefined });
    const saved = await this.repository.save(lead);
    await this.webhooksService.dispatch(tenantId, WebhookEventType.LEAD_CREATED, {
      leadId: saved.id,
      name: saved.name,
      source: saved.source,
      ownerUserId: saved.ownerUserId,
    });
    return saved;
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
