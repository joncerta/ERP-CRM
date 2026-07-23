import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoiceAdjustment, InvoiceAdjustmentType } from './entities/invoice-adjustment.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { RecurringInvoiceTemplate } from './entities/recurring-invoice-template.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceAdjustmentDto } from './dto/create-invoice-adjustment.dto';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { CreateRecurringTemplateDto } from './dto/create-recurring-template.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { QuotesService } from '../../crm/quotes/quotes.service';
import { QuoteStatus } from '../../crm/quotes/entities/quote.entity';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Reminder copy escalates in tone by how many have already gone out for
 * this invoice — first one friendly, from the second on firmer. */
const REMINDER_TEMPLATES = [
  (invoiceNumber: string, balance: number, currency: string) =>
    `Te recordamos que la factura ${invoiceNumber} por ${currency} ${balance.toLocaleString()} está pendiente de pago.`,
  (invoiceNumber: string, balance: number, currency: string) =>
    `La factura ${invoiceNumber} por ${currency} ${balance.toLocaleString()} sigue pendiente. Por favor regulariza el pago a la brevedad.`,
];

@Injectable()
export class InvoicesService extends TenantScopedService<Invoice> {
  constructor(
    @InjectRepository(Invoice) repo: Repository<Invoice>,
    @InjectRepository(InvoiceAdjustment) private readonly adjustmentsRepo: Repository<InvoiceAdjustment>,
    @InjectRepository(InvoicePayment) private readonly paymentsRepo: Repository<InvoicePayment>,
    @InjectRepository(RecurringInvoiceTemplate) private readonly templatesRepo: Repository<RecurringInvoiceTemplate>,
    private readonly documentSeriesService: DocumentSeriesService,
    private readonly notificationEscalationService: NotificationEscalationService,
    private readonly quotesService: QuotesService,
  ) {
    super(repo);
  }

  private buildItemsAndTotals(items: { description: string; quantity: number; unitPrice: number }[], taxRate = 0) {
    const invoiceItems = items.map((item) =>
      Object.assign(new InvoiceItem(), {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: round2(item.quantity * item.unitPrice),
      }),
    );
    const subtotal = round2(invoiceItems.reduce((sum, item) => sum + Number(item.total), 0));
    const tax = round2(subtotal * (taxRate / 100));
    const total = round2(subtotal + tax);
    return { invoiceItems, subtotal, tax, total };
  }

  private nextInvoiceNumber(tenantId: string): Promise<string> {
    return this.documentSeriesService.consumeNext(tenantId, 'invoice');
  }

  /** What's actually owed right now: total, plus net adjustments, minus what's been paid. */
  private balanceDue(invoice: Pick<Invoice, 'total' | 'adjustmentsTotal' | 'amountPaid'>): number {
    return round2(Number(invoice.total) + Number(invoice.adjustmentsTotal) - Number(invoice.amountPaid));
  }

  findPaginated(tenantId: string, query: ListInvoicesQueryDto): Promise<Paginated<Invoice>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'invoice',
      searchColumns: ['invoiceNumber'],
      sortableColumns: ['invoiceNumber', 'status', 'total', 'dueDate', 'createdAt'],
      defaultSortBy: 'createdAt',
      applyFilters: (qb) => {
        if (query.status) qb.andWhere('invoice.status = :status', { status: query.status });
        if (query.ownerUserId) qb.andWhere('invoice.ownerUserId = :ownerUserId', { ownerUserId: query.ownerUserId });
        if (query.companyId) qb.andWhere('invoice.companyId = :companyId', { companyId: query.companyId });
      },
    });
  }

  async create(tenantId: string, ownerUserId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const { invoiceItems, subtotal, tax, total } = this.buildItemsAndTotals(dto.items, dto.taxRate);
    const invoice = this.repository.create({
      tenantId,
      ownerUserId,
      companyId: dto.companyId,
      contactId: dto.contactId ?? null,
      quoteId: dto.quoteId ?? null,
      currencyCode: dto.currencyCode ?? 'USD',
      issueDate: dto.issueDate,
      dueDate: dto.dueDate ?? null,
      status: InvoiceStatus.DRAFT,
      invoiceNumber: await this.nextInvoiceNumber(tenantId),
      items: invoiceItems,
      subtotal,
      tax,
      total,
    });
    return this.repository.save(invoice);
  }

  /** Converts an accepted quote into a draft invoice, copying its
   * company/contact/currency/items — the numbers get recomputed here
   * rather than trusted verbatim, in case the quote's tax rate implied by
   * subtotal/tax has since drifted. */
  async createFromQuote(tenantId: string, ownerUserId: string, quoteId: string, issueDate: string): Promise<Invoice> {
    const quote = await this.quotesService.findOneForTenant(tenantId, quoteId);
    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Solo se puede facturar una cotización aceptada');
    }
    const taxRate = Number(quote.subtotal) > 0 ? (Number(quote.tax) / Number(quote.subtotal)) * 100 : 0;
    return this.create(tenantId, ownerUserId, {
      companyId: quote.companyId,
      contactId: quote.contactId ?? undefined,
      quoteId: quote.id,
      currencyCode: quote.currencyCode,
      taxRate,
      issueDate,
      items: quote.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    });
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOneForTenant(tenantId, id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden editar facturas en borrador');
    }
    if (dto.items) {
      const { invoiceItems, subtotal, tax, total } = this.buildItemsAndTotals(dto.items, dto.taxRate);
      invoice.items = invoiceItems;
      invoice.subtotal = subtotal;
      invoice.tax = tax;
      invoice.total = total;
    }
    if (dto.companyId) invoice.companyId = dto.companyId;
    if (dto.contactId) invoice.contactId = dto.contactId;
    if (dto.currencyCode) invoice.currencyCode = dto.currencyCode;
    if (dto.issueDate) invoice.issueDate = dto.issueDate;
    if (dto.dueDate) invoice.dueDate = dto.dueDate;
    return this.repository.save(invoice);
  }

  async issue(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOneForTenant(tenantId, id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('La factura ya fue emitida');
    }
    invoice.status = InvoiceStatus.ISSUED;
    return this.repository.save(invoice);
  }

  async cancel(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOneForTenant(tenantId, id);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('No se puede cancelar una factura ya pagada');
    }
    invoice.status = InvoiceStatus.CANCELLED;
    return this.repository.save(invoice);
  }

  async addAdjustment(
    tenantId: string,
    invoiceId: string,
    actingUserId: string,
    dto: CreateInvoiceAdjustmentDto,
  ): Promise<InvoiceAdjustment> {
    const invoice = await this.findOneForTenant(tenantId, invoiceId);
    const signedAmount = dto.type === InvoiceAdjustmentType.CREDIT ? -Math.abs(dto.amount) : Math.abs(dto.amount);

    const adjustment = await this.adjustmentsRepo.save(
      this.adjustmentsRepo.create({
        tenantId,
        invoiceId,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason ?? null,
        createdByUserId: actingUserId,
      }),
    );

    invoice.adjustmentsTotal = round2(Number(invoice.adjustmentsTotal) + signedAmount);
    await this.repository.save(invoice);
    return adjustment;
  }

  findAdjustments(tenantId: string, invoiceId: string): Promise<InvoiceAdjustment[]> {
    return this.adjustmentsRepo.find({ where: { tenantId, invoiceId }, order: { createdAt: 'DESC' } });
  }

  async addPayment(
    tenantId: string,
    invoiceId: string,
    actingUserId: string,
    dto: CreateInvoicePaymentDto,
  ): Promise<InvoicePayment> {
    const invoice = await this.findOneForTenant(tenantId, invoiceId);
    if (![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status)) {
      throw new BadRequestException('Esta factura no admite el registro de pagos en su estado actual');
    }

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        tenantId,
        invoiceId,
        amount: dto.amount,
        method: dto.method ?? null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        note: dto.note ?? null,
        createdByUserId: actingUserId,
      }),
    );

    invoice.amountPaid = round2(Number(invoice.amountPaid) + dto.amount);
    const balance = this.balanceDue(invoice);
    invoice.status = balance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    await this.repository.save(invoice);

    await this.notificationEscalationService.notifyWithEscalation(
      tenantId,
      invoice.ownerUserId,
      'invoice.payment_received',
      'Pago registrado',
      `Se registró un pago de ${invoice.currencyCode} ${dto.amount.toLocaleString()} en la factura ${invoice.invoiceNumber}.`,
      '/invoices',
    );

    return payment;
  }

  findPayments(tenantId: string, invoiceId: string): Promise<InvoicePayment[]> {
    return this.paymentsRepo.find({ where: { tenantId, invoiceId }, order: { paidAt: 'DESC' } });
  }

  /** Sends a collection reminder whose tone escalates with reminderCount —
   * friendly the first time, firmer from the second on. Delivered as an
   * in-app notification to the invoice owner (email delivery would need the
   * contact's address wired the way QuotesService does for sending). */
  async sendReminder(tenantId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await this.findOneForTenant(tenantId, invoiceId);
    const balance = this.balanceDue(invoice);
    if (balance <= 0) {
      throw new BadRequestException('Esta factura no tiene saldo pendiente');
    }
    const template = REMINDER_TEMPLATES[Math.min(invoice.reminderCount, REMINDER_TEMPLATES.length - 1)];
    await this.notificationEscalationService.notifyWithEscalation(
      tenantId,
      invoice.ownerUserId,
      'invoice.reminder_sent',
      'Recordatorio de cobro',
      template(invoice.invoiceNumber, balance, invoice.currencyCode),
      '/invoices',
    );
    invoice.reminderCount += 1;
    return this.repository.save(invoice);
  }

  // --- Recurring templates ---

  findTemplates(tenantId: string): Promise<RecurringInvoiceTemplate[]> {
    return this.templatesRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  createTemplate(tenantId: string, ownerUserId: string, dto: CreateRecurringTemplateDto): Promise<RecurringInvoiceTemplate> {
    const template = this.templatesRepo.create({
      tenantId,
      ownerUserId,
      name: dto.name,
      companyId: dto.companyId,
      contactId: dto.contactId ?? null,
      currencyCode: dto.currencyCode ?? 'USD',
      frequency: dto.frequency,
      taxRate: dto.taxRate ?? 0,
      items: dto.items,
    });
    return this.templatesRepo.save(template);
  }

  async setTemplateActive(tenantId: string, id: string, isActive: boolean): Promise<RecurringInvoiceTemplate> {
    const template = await this.templatesRepo.findOne({ where: { tenantId, id } });
    if (!template) throw new BadRequestException('Plantilla no encontrada');
    template.isActive = isActive;
    return this.templatesRepo.save(template);
  }

  /** Generates a new draft invoice from a recurring template — a manual
   * action the user triggers each billing cycle, since there's no job
   * scheduler here to fire it automatically. */
  async generateFromTemplate(tenantId: string, templateId: string, issueDate: string): Promise<Invoice> {
    const template = await this.templatesRepo.findOne({ where: { tenantId, id: templateId } });
    if (!template) throw new BadRequestException('Plantilla no encontrada');
    if (!template.isActive) throw new BadRequestException('Esta plantilla está inactiva');

    const invoice = await this.create(tenantId, template.ownerUserId, {
      companyId: template.companyId,
      contactId: template.contactId ?? undefined,
      currencyCode: template.currencyCode,
      taxRate: Number(template.taxRate),
      issueDate,
      items: template.items,
    });

    template.lastGeneratedAt = new Date();
    await this.templatesRepo.save(template);
    return invoice;
  }
}
