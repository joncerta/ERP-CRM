import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SupplierInvoicesService } from './supplier-invoices.service';
import { SupplierInvoice, SupplierInvoiceStatus } from './entities/supplier-invoice.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { AccountingService } from '../accounting/accounting.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'supplier-invoice-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<SupplierInvoice>>;
  const paymentsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'supplier-payment-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<SupplierPayment>>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  const accountingService = {
    postSupplierInvoice: jest.fn().mockResolvedValue(undefined),
    postSupplierPayment: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AccountingService>;
  return { repo, paymentsRepo, notificationEscalationService, accountingService };
}

function buildService() {
  const deps = buildDeps();
  const service = new SupplierInvoicesService(deps.repo, deps.paymentsRepo, deps.notificationEscalationService, deps.accountingService);
  return { service, ...deps };
}

describe('SupplierInvoicesService', () => {
  describe('addPayment', () => {
    it('marks the invoice fully paid once the balance reaches zero', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'supplier-invoice-1',
        tenantId: 'tenant-a',
        status: SupplierInvoiceStatus.PENDING,
        amount: 100,
        amountPaid: 0,
        ownerUserId: 'user-1',
        currencyCode: 'USD',
        supplierInvoiceNumber: 'PROV-001',
      } as SupplierInvoice);

      await service.addPayment('tenant-a', 'supplier-invoice-1', 'user-2', { amount: 100 });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: SupplierInvoiceStatus.PAID, amountPaid: 100 }));
    });

    it('marks the invoice partially paid when the balance remains positive, and escalates a notification', async () => {
      const { service, repo, notificationEscalationService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'supplier-invoice-1',
        tenantId: 'tenant-a',
        status: SupplierInvoiceStatus.PENDING,
        amount: 100,
        amountPaid: 0,
        ownerUserId: 'user-1',
        currencyCode: 'USD',
        supplierInvoiceNumber: 'PROV-001',
      } as SupplierInvoice);

      await service.addPayment('tenant-a', 'supplier-invoice-1', 'user-2', { amount: 40 });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SupplierInvoiceStatus.PARTIALLY_PAID, amountPaid: 40 }),
      );
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'supplier_invoice.payment_made',
        expect.any(String),
        expect.any(String),
        '/purchases',
      );
    });

    it('refuses a payment on an already-paid invoice', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'supplier-invoice-1',
        tenantId: 'tenant-a',
        status: SupplierInvoiceStatus.PAID,
      } as SupplierInvoice);

      await expect(
        service.addPayment('tenant-a', 'supplier-invoice-1', 'user-2', { amount: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('refuses to cancel an already-paid invoice', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'supplier-invoice-1', tenantId: 'tenant-a', status: SupplierInvoiceStatus.PAID } as SupplierInvoice);

      await expect(service.cancel('tenant-a', 'supplier-invoice-1')).rejects.toThrow(BadRequestException);
    });
  });
});
