import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiProviderService } from './ai-provider.service';
import { LeadPriority } from '../crm/leads/entities/lead.entity';

function buildDeps() {
  const aiProvider = { complete: jest.fn() } as unknown as jest.Mocked<AiProviderService>;
  const quotesService = { findOneForTenant: jest.fn(), findAllForTenant: jest.fn() } as any;
  const ticketsService = { findOneForTenant: jest.fn(), findAllForTenant: jest.fn() } as any;
  const productsService = { findOneForTenant: jest.fn() } as any;
  const companiesService = { findOneForTenant: jest.fn() } as any;
  const opportunitiesService = { findAllForTenant: jest.fn() } as any;
  const pipelineStagesService = { findAllForTenant: jest.fn() } as any;
  const leadsService = { findOneForTenant: jest.fn(), findAllForTenant: jest.fn() } as any;
  const quoteFollowUpsService = { findAllForTenant: jest.fn() } as any;
  const activitiesService = { findAllForTenant: jest.fn() } as any;
  return { aiProvider, quotesService, ticketsService, productsService, companiesService, opportunitiesService, pipelineStagesService, leadsService, quoteFollowUpsService, activitiesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new AiService(
    deps.aiProvider,
    deps.quotesService,
    deps.ticketsService,
    deps.productsService,
    deps.companiesService,
    deps.opportunitiesService,
    deps.pipelineStagesService,
    deps.leadsService,
    deps.quoteFollowUpsService,
    deps.activitiesService,
  );
  return { service, ...deps };
}

describe('AiService', () => {
  describe('scoreLead', () => {
    it('parses a valid JSON response from the provider', async () => {
      const { service, leadsService, aiProvider } = buildService();
      leadsService.findOneForTenant.mockResolvedValue({ id: 'lead-1', name: 'Acme', source: 'web', interest: 'x', estimatedBudget: 1000, status: 'new' });
      aiProvider.complete.mockResolvedValue('{"priority": "high", "reasoning": "Presupuesto alto y fuente calificada"}');

      const result = await service.scoreLead('tenant-a', { leadId: 'lead-1' });

      expect(result).toEqual({ leadId: 'lead-1', priority: LeadPriority.HIGH, reasoning: 'Presupuesto alto y fuente calificada' });
    });

    it('tolerates a response wrapped in markdown code fences', async () => {
      const { service, leadsService, aiProvider } = buildService();
      leadsService.findOneForTenant.mockResolvedValue({ id: 'lead-1', name: 'Acme', status: 'new' });
      aiProvider.complete.mockResolvedValue('```json\n{"priority": "low", "reasoning": "Sin presupuesto claro"}\n```');

      const result = await service.scoreLead('tenant-a', { leadId: 'lead-1' });

      expect(result.priority).toBe(LeadPriority.LOW);
    });

    it('throws when the provider response is not valid JSON', async () => {
      const { service, leadsService, aiProvider } = buildService();
      leadsService.findOneForTenant.mockResolvedValue({ id: 'lead-1', name: 'Acme', status: 'new' });
      aiProvider.complete.mockResolvedValue('esto no es json');

      await expect(service.scoreLead('tenant-a', { leadId: 'lead-1' })).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws when the provider returns an invalid priority value', async () => {
      const { service, leadsService, aiProvider } = buildService();
      leadsService.findOneForTenant.mockResolvedValue({ id: 'lead-1', name: 'Acme', status: 'new' });
      aiProvider.complete.mockResolvedValue('{"priority": "urgent", "reasoning": "x"}');

      await expect(service.scoreLead('tenant-a', { leadId: 'lead-1' })).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('assistant', () => {
    it('builds a context snapshot and returns the provider answer', async () => {
      const { service, leadsService, quoteFollowUpsService, ticketsService, activitiesService, aiProvider } = buildService();
      leadsService.findAllForTenant.mockResolvedValue([{ status: 'new' }, { status: 'new' }, { status: 'qualified' }]);
      quoteFollowUpsService.findAllForTenant.mockResolvedValue([{ id: 'f-1' }]);
      ticketsService.findAllForTenant.mockResolvedValue([{ status: 'open', priority: 'high' }, { status: 'closed', priority: 'low' }]);
      activitiesService.findAllForTenant.mockResolvedValue([]);
      aiProvider.complete.mockResolvedValue('Tienes 2 leads nuevos y 1 seguimiento pendiente.');

      const result = await service.assistant('tenant-a', { question: '¿Cómo va mi pipeline?' });

      expect(result.answer).toBe('Tienes 2 leads nuevos y 1 seguimiento pendiente.');
      expect(aiProvider.complete).toHaveBeenCalledWith(expect.stringContaining('new: 2, qualified: 1'));
      expect(aiProvider.complete).toHaveBeenCalledWith(expect.stringContaining('Seguimientos de cotizaciones pendientes: 1'));
    });
  });
});
