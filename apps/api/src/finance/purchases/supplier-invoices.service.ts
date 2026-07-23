import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierInvoice, SupplierInvoiceStatus } from './entities/supplier-invoice.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierInvoicesQueryDto } from './dto/list-supplier-invoices-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class SupplierInvoicesService extends TenantScopedService<SupplierInvoice> {
  constructor(
    @InjectRepository(SupplierInvoice) repo: Repository<SupplierInvoice>,
    @InjectRepository(SupplierPayment) private readonly paymentsRepo: Repository<SupplierPayment>,
    private readonly notificationEscalationService: NotificationEscalationService,
  ) {
    super(repo);
  }

  private balanceDue(invoice: Pick<SupplierInvoice, 'amount' | 'amountPaid'>): number {
    return round2(Number(invoice.amount) - Number(invoice.amountPaid));
  }

  findPaginated(tenantId: string, query: ListSupplierInvoicesQueryDto): Promise<Paginated<SupplierInvoice>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'supplierInvoice',
      searchColumns: ['supplierInvoiceNumber'],
      sortableColumns: ['supplierInvoiceNumber', 'status', 'amount', 'dueDate', 'createdAt'],
      defaultSortBy: 'createdAt',
      applyFilters: (qb) => {
        if (query.status) qb.andWhere('supplierInvoice.status = :status', { status: query.status });
        if (query.ownerUserId) qb.andWhere('supplierInvoice.ownerUserId = :ownerUserId', { ownerUserId: query.ownerUserId });
        if (query.supplierId) qb.andWhere('supplierInvoice.supplierId = :supplierId', { supplierId: query.supplierId });
      },
    });
  }

  create(tenantId: string, ownerUserId: string, dto: CreateSupplierInvoiceDto): Promise<SupplierInvoice> {
    const invoice = this.repository.create({
      tenantId,
      ownerUserId,
      supplierId: dto.supplierId,
      purchaseOrderId: dto.purchaseOrderId ?? null,
      supplierInvoiceNumber: dto.supplierInvoiceNumber,
      currencyCode: dto.currencyCode ?? 'USD',
      amount: dto.amount,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate ?? null,
      status: SupplierInvoiceStatus.PENDING,
    });
    return this.repository.save(invoice);
  }

  async addPayment(
    tenantId: string,
    supplierInvoiceId: string,
    actingUserId: string,
    dto: CreateSupplierPaymentDto,
  ): Promise<SupplierPayment> {
    const invoice = await this.findOneForTenant(tenantId, supplierInvoiceId);
    if (![SupplierInvoiceStatus.PENDING, SupplierInvoiceStatus.PARTIALLY_PAID].includes(invoice.status)) {
      throw new BadRequestException('Esta factura de proveedor no admite el registro de pagos en su estado actual');
    }

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        tenantId,
        supplierInvoiceId,
        amount: dto.amount,
        method: dto.method ?? null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        note: dto.note ?? null,
        createdByUserId: actingUserId,
      }),
    );

    invoice.amountPaid = round2(Number(invoice.amountPaid) + dto.amount);
    const balance = this.balanceDue(invoice);
    invoice.status = balance <= 0 ? SupplierInvoiceStatus.PAID : SupplierInvoiceStatus.PARTIALLY_PAID;
    await this.repository.save(invoice);

    await this.notificationEscalationService.notifyWithEscalation(
      tenantId,
      invoice.ownerUserId,
      'supplier_invoice.payment_made',
      'Pago a proveedor registrado',
      `Se registró un pago de ${invoice.currencyCode} ${dto.amount.toLocaleString()} en la factura ${invoice.supplierInvoiceNumber}.`,
      '/purchases',
    );

    return payment;
  }

  findPayments(tenantId: string, supplierInvoiceId: string): Promise<SupplierPayment[]> {
    return this.paymentsRepo.find({ where: { tenantId, supplierInvoiceId }, order: { paidAt: 'DESC' } });
  }

  async cancel(tenantId: string, id: string): Promise<SupplierInvoice> {
    const invoice = await this.findOneForTenant(tenantId, id);
    if (invoice.status === SupplierInvoiceStatus.PAID) {
      throw new BadRequestException('No se puede cancelar una factura ya pagada');
    }
    invoice.status = SupplierInvoiceStatus.CANCELLED;
    return this.repository.save(invoice);
  }
}
