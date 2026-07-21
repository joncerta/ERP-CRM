import { Repository } from 'typeorm';
import { OpportunitiesService } from './opportunities.service';
import { Opportunity, OpportunityStatus } from './entities/opportunity.entity';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service';
import { LeadsService } from '../leads/leads.service';
import { LeadStatus } from '../leads/entities/lead.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'opp-1', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Opportunity>>;
  const pipelineStagesService = {
    findOneForTenant: jest.fn(),
    findAllOrdered: jest.fn(),
  } as unknown as jest.Mocked<PipelineStagesService>;
  const leadsService = {
    findOneForTenant: jest.fn(),
    markConverted: jest.fn(),
  } as unknown as jest.Mocked<LeadsService>;
  return { repo, pipelineStagesService, leadsService };
}

describe('OpportunitiesService', () => {
  let repo: ReturnType<typeof buildDeps>['repo'];
  let pipelineStagesService: ReturnType<typeof buildDeps>['pipelineStagesService'];
  let leadsService: ReturnType<typeof buildDeps>['leadsService'];
  let service: OpportunitiesService;

  beforeEach(() => {
    ({ repo, pipelineStagesService, leadsService } = buildDeps());
    service = new OpportunitiesService(repo, pipelineStagesService, leadsService);
  });

  describe('create', () => {
    it('takes the probability from the target stage rather than the caller', async () => {
      pipelineStagesService.findOneForTenant.mockResolvedValue({ id: 'stage-1', probability: 40 } as never);
      const opp = await service.create('tenant-a', { name: 'Deal', stageId: 'stage-1' } as never);
      expect(opp).toMatchObject({ probability: 40, tenantId: 'tenant-a' });
    });

    it('defaults currency to USD when not given', async () => {
      pipelineStagesService.findOneForTenant.mockResolvedValue({ id: 'stage-1', probability: 10 } as never);
      const opp = await service.create('tenant-a', { name: 'Deal', stageId: 'stage-1' } as never);
      expect(opp).toMatchObject({ currencyCode: 'USD' });
    });
  });

  describe('createFromLead', () => {
    const lead = {
      id: 'lead-1',
      name: 'Interés en licencias',
      companyId: 'company-1',
      contactId: 'contact-1',
      estimatedBudget: 5_000_000,
      ownerUserId: 'user-1',
      status: LeadStatus.NEW,
    };

    beforeEach(() => {
      leadsService.findOneForTenant.mockResolvedValue(lead as never);
      pipelineStagesService.findAllOrdered.mockResolvedValue([
        { id: 'stage-first', probability: 10, isWon: false, isLost: false },
        { id: 'stage-second', probability: 25, isWon: false, isLost: false },
      ] as never);
      pipelineStagesService.findOneForTenant.mockImplementation(async (_tenantId, stageId) => {
        const stages: Record<string, unknown> = {
          'stage-first': { id: 'stage-first', probability: 10 },
        };
        return stages[stageId] as never;
      });
    });

    it('copies name, company, contact, budget and owner from the lead when not overridden', async () => {
      const opp = await service.createFromLead('tenant-a', 'lead-1', {});
      expect(opp).toMatchObject({
        name: 'Interés en licencias',
        leadId: 'lead-1',
        companyId: 'company-1',
        contactId: 'contact-1',
        value: 5_000_000,
        ownerUserId: 'user-1',
      });
    });

    it('lands the opportunity in the first pipeline stage when none is specified', async () => {
      const opp = await service.createFromLead('tenant-a', 'lead-1', {});
      expect(opp).toMatchObject({ stageId: 'stage-first' });
    });

    it('marks the source lead as converted', async () => {
      await service.createFromLead('tenant-a', 'lead-1', {});
      expect(leadsService.markConverted).toHaveBeenCalledWith('tenant-a', 'lead-1');
    });

    it('lets the caller override fields instead of always copying from the lead', async () => {
      pipelineStagesService.findOneForTenant.mockResolvedValue({ id: 'stage-second', probability: 25 } as never);
      const opp = await service.createFromLead('tenant-a', 'lead-1', {
        name: 'Nombre distinto',
        stageId: 'stage-second',
      });
      expect(opp).toMatchObject({ name: 'Nombre distinto', stageId: 'stage-second' });
    });
  });

  describe('moveStage', () => {
    it('marks the opportunity WON when it lands on a stage flagged isWon', async () => {
      repo.findOne.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-a' } as Opportunity);
      pipelineStagesService.findOneForTenant.mockResolvedValue({ id: 'stage-won', probability: 100, isWon: true, isLost: false } as never);
      const opp = await service.moveStage('tenant-a', 'opp-1', 'stage-won');
      expect(opp.status).toBe(OpportunityStatus.WON);
    });

    it('marks the opportunity LOST when it lands on a stage flagged isLost', async () => {
      repo.findOne.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-a' } as Opportunity);
      pipelineStagesService.findOneForTenant.mockResolvedValue({ id: 'stage-lost', probability: 0, isWon: false, isLost: true } as never);
      const opp = await service.moveStage('tenant-a', 'opp-1', 'stage-lost');
      expect(opp.status).toBe(OpportunityStatus.LOST);
    });

    it('keeps the opportunity OPEN on a normal stage', async () => {
      repo.findOne.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-a', status: OpportunityStatus.WON } as Opportunity);
      pipelineStagesService.findOneForTenant.mockResolvedValue({ id: 'stage-mid', probability: 40, isWon: false, isLost: false } as never);
      const opp = await service.moveStage('tenant-a', 'opp-1', 'stage-mid');
      expect(opp.status).toBe(OpportunityStatus.OPEN);
    });
  });
});
