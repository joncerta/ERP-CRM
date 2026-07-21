import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity, OpportunityStatus } from './entities/opportunity.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class OpportunitiesService extends TenantScopedService<Opportunity> {
  constructor(
    @InjectRepository(Opportunity) repo: Repository<Opportunity>,
    private readonly pipelineStagesService: PipelineStagesService,
    private readonly leadsService: LeadsService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateOpportunityDto): Promise<Opportunity> {
    const stage = await this.pipelineStagesService.findOneForTenant(tenantId, dto.stageId);
    const opportunity = this.repository.create({
      ...dto,
      tenantId,
      probability: stage.probability,
      currencyCode: dto.currencyCode ?? 'USD',
    });
    return this.repository.save(opportunity);
  }

  async createFromLead(tenantId: string, leadId: string, dto: Partial<CreateOpportunityDto>): Promise<Opportunity> {
    const lead = await this.leadsService.findOneForTenant(tenantId, leadId);
    const [firstStage] = await this.pipelineStagesService.findAllOrdered(tenantId);

    const opportunity = await this.create(tenantId, {
      name: dto.name ?? lead.name,
      leadId: lead.id,
      companyId: dto.companyId ?? lead.companyId ?? undefined,
      contactId: dto.contactId ?? lead.contactId ?? undefined,
      stageId: dto.stageId ?? firstStage?.id,
      value: dto.value ?? lead.estimatedBudget ?? undefined,
      currencyCode: dto.currencyCode,
      ownerUserId: dto.ownerUserId ?? lead.ownerUserId ?? undefined,
    });

    await this.leadsService.markConverted(tenantId, lead.id);
    return opportunity;
  }

  async update(tenantId: string, id: string, dto: UpdateOpportunityDto): Promise<Opportunity> {
    const opportunity = await this.findOneForTenant(tenantId, id);
    Object.assign(opportunity, dto);
    return this.repository.save(opportunity);
  }

  async moveStage(tenantId: string, id: string, stageId: string): Promise<Opportunity> {
    const opportunity = await this.findOneForTenant(tenantId, id);
    const stage = await this.pipelineStagesService.findOneForTenant(tenantId, stageId);

    opportunity.stageId = stage.id;
    opportunity.probability = stage.probability;
    if (stage.isWon) opportunity.status = OpportunityStatus.WON;
    else if (stage.isLost) opportunity.status = OpportunityStatus.LOST;
    else opportunity.status = OpportunityStatus.OPEN;

    return this.repository.save(opportunity);
  }

  async closeLost(tenantId: string, id: string, reason?: string): Promise<Opportunity> {
    const opportunity = await this.findOneForTenant(tenantId, id);
    const stages = await this.pipelineStagesService.findAllOrdered(tenantId);
    const lostStage = stages.find((s) => s.isLost);

    opportunity.status = OpportunityStatus.LOST;
    opportunity.lostReason = reason ?? opportunity.lostReason;
    if (lostStage) {
      opportunity.stageId = lostStage.id;
      opportunity.probability = lostStage.probability;
    }
    return this.repository.save(opportunity);
  }

  findByStage(tenantId: string, stageId: string): Promise<Opportunity[]> {
    return this.repository.find({ where: { tenantId, stageId } });
  }
}
