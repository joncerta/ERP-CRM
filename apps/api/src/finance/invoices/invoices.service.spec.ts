import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceAdjustment, InvoiceAdjustmentType } from './entities/invoice-adjustment.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { RecurringInvoiceTemplate } from './entities/recurring-invoice-template.entity';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { QuotesService } from '../../crm/quotes/quotes.service';
import { QuoteStatus } from '../../crm/quotes/entities/quote.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'invoice-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Invoice>>;
  const adjustmentsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'adjustment-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<InvoiceAdjustment>>;
  const paymentsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'payment-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<InvoicePayment>>;
  const templatesRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'template-1', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<RecurringInvoiceTemplate>>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('FAC-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  const quotesService = {
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<QuotesService>;
  return { repo, adjustmentsRepo, paymentsRepo, templatesRepo, documentSeriesService, notificationEscalationService, quotesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new InvoicesService(
    deps.repo,
    deps.adjustmentsRepo,
    deps.paymentsRepo,
    deps.templatesRepo,
    deps.documentSeriesService,
    deps.notificationEscalationService,
    deps.quotesService,
  );
  return { service, ...deps };
}

describe('InvoicesService', () => {
  describe('create', () => {
    it('computes totals from items and claims a number from the document series', async () => {
      const { service, documentSeriesService } = buildService();

      const invoice = await service.create('tenant-a', 'user-1', {
        companyId: 'company-1',
        issueDate: '2026-01-01',
        taxRate: 19,
        items: [{ description: 'Servicio', quantity: 2, unitPrice: 100 }],
      });

      expect(documentSeriesService.consumeNext).toHaveBeenCalledWith('tenant-a', 'invoice');
      expect(invoice).toMatchObject({ subtotal: 200, tax: 38, total: 238, status: InvoiceStatus.DRAFT });
    });
  });

  describe('createFromQuote', () => {
    it('refuses to invoice a quote that is not accepted', async () => {
      const { service, quotesService } = buildService();
      quotesService.findOneForTenant.mockResolvedValue({ status: QuoteStatus.SENT } as never);

      await expect(service.createFromQuote('tenant-a', 'user-1', 'quote-1', '2026-01-01')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('copies company/contact/items from an accepted quote', async () => {
      const { service, quotesService } = buildService();
      quotesService.findOneForTenant.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.ACCEPTED,
        companyId: 'company-1',
        contactId: 'contact-1',
        currencyCode: 'USD',
        subtotal: 100,
        tax: 19,
        items: [{ description: 'Item A', quantity: 1, unitPrice: 100 }],
      } as never);

      const invoice = await service.createFromQuote('tenant-a', 'user-1', 'quote-1', '2026-01-01');

      expect(invoice).toMatchObject({ companyId: 'company-1', contactId: 'contact-1', quoteId: 'quote-1', total: 119 });
    });
  });

  describe('addPayment', () => {
    it('marks the invoice fully paid once the balance reaches zero', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-a',
        status: InvoiceStatus.ISSUED,
        total: 100,
        adjustmentsTotal: 0,
        amountPaid: 0,
        ownerUserId: 'user-1',
        currencyCode: 'USD',
        invoiceNumber: 'FAC-000001',
      } as Invoice);

      const updated = await service.addPayment('tenant-a', 'invoice-1', 'user-2', { amount: 100 });
      expect(updated).toMatchObject({ amount: 100, invoiceId: 'invoice-1' });
    });

    it('marks the invoice partially paid when the balance remains positive, and escalates a notification', async () => {
      const { service, repo, notificationEscalationService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-a',
        status: InvoiceStatus.ISSUED,
        total: 100,
        adjustmentsTotal: 0,
        amountPaid: 0,
        ownerUserId: 'user-1',
        currencyCode: 'USD',
        invoiceNumber: 'FAC-000001',
      } as Invoice);

      await service.addPayment('tenant-a', 'invoice-1', 'user-2', { amount: 40 });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: InvoiceStatus.PARTIALLY_PAID, amountPaid: 40 }));
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'invoice.payment_received',
        expect.any(String),
        expect.any(String),
        '/invoices',
      );
    });

    it('refuses a payment on a draft invoice', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'invoice-1', tenantId: 'tenant-a', status: InvoiceStatus.DRAFT } as Invoice);

      await expect(service.addPayment('tenant-a', 'invoice-1', 'user-2', { amount: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addAdjustment', () => {
    it('a credit note subtracts from the effective balance', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-a',
        adjustmentsTotal: 0,
      } as Invoice);

      await service.addAdjustment('tenant-a', 'invoice-1', 'user-1', {
        type: InvoiceAdjustmentType.CREDIT,
        amount: 20,
      });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ adjustmentsTotal: -20 }));
    });

    it('a debit note adds to the effective balance', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-a',
        adjustmentsTotal: 0,
      } as Invoice);

      await service.addAdjustment('tenant-a', 'invoice-1', 'user-1', {
        type: InvoiceAdjustmentType.DEBIT,
        amount: 15,
      });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ adjustmentsTotal: 15 }));
    });
  });

  describe('sendReminder', () => {
    it('uses the friendly template on the first reminder and escalates the tone afterward', async () => {
      const { service, repo, notificationEscalationService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-a',
        total: 100,
        adjustmentsTotal: 0,
        amountPaid: 0,
        reminderCount: 0,
        ownerUserId: 'user-1',
        currencyCode: 'USD',
        invoiceNumber: 'FAC-000001',
      } as Invoice);

      await service.sendReminder('tenant-a', 'invoice-1');

      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'invoice.reminder_sent',
        expect.any(String),
        expect.stringContaining('recordamos'),
        '/invoices',
      );
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ reminderCount: 1 }));
    });

    it('refuses to remind an invoice with no outstanding balance', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-a',
        total: 100,
        adjustmentsTotal: 0,
        amountPaid: 100,
      } as Invoice);

      await expect(service.sendReminder('tenant-a', 'invoice-1')).rejects.toThrow(BadRequestException);
    });
  });
});
