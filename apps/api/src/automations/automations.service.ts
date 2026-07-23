import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../crm/leads/entities/lead.entity';
import { Invoice, InvoiceStatus } from '../finance/invoices/entities/invoice.entity';
import { AutomationRuleType, LeadStaleReminderConfig } from './entities/automation-rule.entity';
import { WebhookEventType } from './entities/webhook-subscription.entity';
import { AutomationRulesService } from './automation-rules.service';
import { WebhooksService } from './webhooks.service';
import { NotificationEscalationService } from '../core/users/notification-escalation.service';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
    private readonly automationRulesService: AutomationRulesService,
    private readonly webhooksService: WebhooksService,
    private readonly notificationEscalationService: NotificationEscalationService,
  ) {}

  /** Manual trigger for everything that's time-based rather than
   * event-driven — same "no scheduler in this project" limitation as
   * depreciation, recurring invoices and marketing nurture sequences. A
   * person, or an external cron hitting this endpoint, runs it
   * periodically. */
  async process(tenantId: string): Promise<{ overdueInvoices: number; staleLeadReminders: number }> {
    const overdueInvoices = await this.processOverdueInvoices(tenantId);
    const staleLeadReminders = await this.processStaleLeads(tenantId);
    return { overdueInvoices, staleLeadReminders };
  }

  /** No scheduler in this project (same limitation as depreciation and
   * recurring invoices) — flips past-due issued/partially-paid invoices
   * to OVERDUE. Idempotent: only touches invoices that aren't already
   * OVERDUE, so re-running is safe. Lives here (not on InvoicesService)
   * to avoid a module cycle: Quotes needs Automations for the
   * quote.accepted webhook, and Invoices already depends on Quotes. */
  private async processOverdueInvoices(tenantId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const candidates = await this.invoicesRepo.find({
      where: [
        { tenantId, status: InvoiceStatus.ISSUED },
        { tenantId, status: InvoiceStatus.PARTIALLY_PAID },
      ],
    });
    const newlyOverdue = candidates.filter((inv) => inv.dueDate && inv.dueDate < today);
    if (newlyOverdue.length) {
      newlyOverdue.forEach((inv) => (inv.status = InvoiceStatus.OVERDUE));
      await this.invoicesRepo.save(newlyOverdue);
    }
    for (const invoice of newlyOverdue) {
      await this.notificationEscalationService.notifyWithEscalation(
        tenantId,
        invoice.ownerUserId,
        'invoice.overdue',
        'Factura vencida',
        `La factura ${invoice.invoiceNumber} venció y sigue sin pagarse por completo.`,
        '/invoices',
      );
      await this.webhooksService.dispatch(tenantId, WebhookEventType.INVOICE_OVERDUE, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        companyId: invoice.companyId,
        total: invoice.total,
        dueDate: invoice.dueDate,
      });
    }
    return newlyOverdue.length;
  }

  private async processStaleLeads(tenantId: string): Promise<number> {
    const rules = await this.automationRulesService.findActiveByType(tenantId, AutomationRuleType.LEAD_STALE_REMINDER);
    if (!rules.length) return 0;

    let notified = 0;
    for (const rule of rules) {
      const staleDays = (rule.config as unknown as LeadStaleReminderConfig).staleDays ?? 7;
      const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

      const staleLeads = await this.leadsRepo
        .createQueryBuilder('lead')
        .where('lead.tenantId = :tenantId', { tenantId })
        .andWhere('lead.status IN (:...statuses)', { statuses: ['new', 'contacted', 'qualified'] })
        .andWhere('lead.ownerUserId IS NOT NULL')
        .andWhere('lead.updatedAt <= :cutoff', { cutoff })
        .andWhere('(lead.lastStaleReminderAt IS NULL OR lead.lastStaleReminderAt <= :cutoff)')
        .getMany();

      for (const lead of staleLeads) {
        await this.notificationEscalationService.notifyWithEscalation(
          tenantId,
          lead.ownerUserId!,
          'lead.stale',
          'Lead sin movimiento',
          `El lead "${lead.name}" lleva ${staleDays}+ días sin actividad.`,
          '/leads',
        );
        lead.lastStaleReminderAt = new Date();
        await this.leadsRepo.save(lead);
        notified += 1;
      }
    }
    return notified;
  }
}
