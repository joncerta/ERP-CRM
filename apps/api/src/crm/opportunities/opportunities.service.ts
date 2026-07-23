import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity, OpportunityStatus } from './entities/opportunity.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';

@Injectable()
export class OpportunitiesService extends TenantScopedService<Opportunity> {
  constructor(
    @InjectRepository(Opportunity) repo: Repository<Opportunity>,
    private readonly pipelineStagesService: PipelineStagesService,
    private readonly leadsService: LeadsService,
    private readonly notificationEscalationService: NotificationEscalationService,
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

    const saved = await this.repository.save(opportunity);
    if (stage.isWon || stage.isLost) await this.notifyOutcome(saved, stage.isWon);
    return saved;
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
    const saved = await this.repository.save(opportunity);
    await this.notifyOutcome(saved, false);
    return saved;
  }

  /** A closed deal (won or lost) is exactly the kind of milestone a
   * coordinator wants to hear about even if their rep doesn't mention it —
   * escalates to the owner's direct manager, per the org hierarchy. */
  private async notifyOutcome(opportunity: Opportunity, won: boolean): Promise<void> {
    if (!opportunity.ownerUserId) return;
    await this.notificationEscalationService.notifyWithEscalation(
      opportunity.tenantId,
      opportunity.ownerUserId,
      won ? 'opportunity.won' : 'opportunity.lost',
      won ? 'Oportunidad ganada' : 'Oportunidad perdida',
      won
        ? `La oportunidad "${opportunity.name}" se cerró como ganada.`
        : `La oportunidad "${opportunity.name}" se cerró como perdida.`,
      '/pipeline',
    );
  }

  findByStage(tenantId: string, stageId: string): Promise<Opportunity[]> {
    return this.repository.find({ where: { tenantId, stageId } });
  }
}
