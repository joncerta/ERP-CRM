import { Repository } from 'typeorm';
import { AutomationsService } from './automations.service';
import { Lead } from '../crm/leads/entities/lead.entity';
import { Invoice, InvoiceStatus } from '../finance/invoices/entities/invoice.entity';
import { AutomationRulesService } from './automation-rules.service';
import { WebhooksService } from './webhooks.service';
import { AutomationRuleType } from './entities/automation-rule.entity';
import { NotificationEscalationService } from '../core/users/notification-escalation.service';

function buildDeps() {
  const staleLeadsQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const leadsRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(staleLeadsQb),
    save: jest.fn(async (data) => data),
  } as unknown as jest.Mocked<Repository<Lead>>;
  const invoicesRepo = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(async (data) => data),
  } as unknown as jest.Mocked<Repository<Invoice>>;
  const automationRulesService = {
    findActiveByType: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<AutomationRulesService>;
  const webhooksService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WebhooksService>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  return { leadsRepo, invoicesRepo, automationRulesService, webhooksService, notificationEscalationService, staleLeadsQb };
}

function buildService() {
  const deps = buildDeps();
  const service = new AutomationsService(
    deps.leadsRepo,
    deps.invoicesRepo,
    deps.automationRulesService,
    deps.webhooksService,
    deps.notificationEscalationService,
  );
  return { service, ...deps };
}

describe('AutomationsService', () => {
  describe('process — overdue invoices', () => {
    it('flags past-due issued invoices as OVERDUE, notifies the owner and dispatches a webhook', async () => {
      const { service, invoicesRepo, notificationEscalationService, webhooksService } = buildService();
      invoicesRepo.find.mockResolvedValue([
        { id: 'inv-1', tenantId: 'tenant-a', status: InvoiceStatus.ISSUED, dueDate: '2020-01-01', ownerUserId: 'user-1', invoiceNumber: 'FAC-1', companyId: 'co-1', total: 100 } as Invoice,
      ]);

      const result = await service.process('tenant-a');

      expect(invoicesRepo.save).toHaveBeenCalledWith([expect.objectContaining({ id: 'inv-1', status: InvoiceStatus.OVERDUE })]);
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'invoice.overdue',
        expect.any(String),
        expect.any(String),
        '/invoices',
      );
      expect(webhooksService.dispatch).toHaveBeenCalledWith('tenant-a', 'invoice.overdue', expect.objectContaining({ invoiceId: 'inv-1' }));
      expect(result.overdueInvoices).toBe(1);
    });

    it('leaves invoices with no due date, or not yet due, untouched', async () => {
      const { service, invoicesRepo } = buildService();
      invoicesRepo.find.mockResolvedValue([
        { id: 'inv-1', tenantId: 'tenant-a', status: InvoiceStatus.ISSUED, dueDate: null } as Invoice,
        { id: 'inv-2', tenantId: 'tenant-a', status: InvoiceStatus.ISSUED, dueDate: '2099-01-01' } as Invoice,
      ]);

      const result = await service.process('tenant-a');

      expect(invoicesRepo.save).not.toHaveBeenCalled();
      expect(result.overdueInvoices).toBe(0);
    });
  });

  describe('process — stale lead reminders', () => {
    it('does nothing when there is no active LEAD_STALE_REMINDER rule', async () => {
      const { service, leadsRepo } = buildService();

      const result = await service.process('tenant-a');

      expect(leadsRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(result.staleLeadReminders).toBe(0);
    });

    it('notifies the owner of each stale lead and stamps lastStaleReminderAt', async () => {
      const { service, automationRulesService, staleLeadsQb, leadsRepo, notificationEscalationService } = buildService();
      automationRulesService.findActiveByType.mockImplementation(async (_tenantId, type) =>
        type === AutomationRuleType.LEAD_STALE_REMINDER ? [{ id: 'rule-1', config: { staleDays: 5 } } as never] : [],
      );
      staleLeadsQb.getMany.mockResolvedValue([{ id: 'lead-1', tenantId: 'tenant-a', name: 'Lead frío', ownerUserId: 'user-1' } as Lead]);

      const result = await service.process('tenant-a');

      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'lead.stale',
        expect.any(String),
        expect.stringContaining('Lead frío'),
        '/leads',
      );
      expect(leadsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'lead-1', lastStaleReminderAt: expect.any(Date) }));
      expect(result.staleLeadReminders).toBe(1);
    });
  });
});
