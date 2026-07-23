import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SupplierInvoicesService } from './supplier-invoices.service';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierInvoicesQueryDto } from './dto/list-supplier-invoices-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('finance/supplier-invoices')
@RequireModule('purchasing')
export class SupplierInvoicesController {
  constructor(private readonly supplierInvoicesService: SupplierInvoicesService) {}

  @Post()
  @RequirePermissions('finance.purchases.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupplierInvoiceDto) {
    return this.supplierInvoicesService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('finance.purchases.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSupplierInvoicesQueryDto) {
    if (query.page) return this.supplierInvoicesService.findPaginated(user.tenantId, query);
    return this.supplierInvoicesService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('finance.purchases.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.supplierInvoicesService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('finance.purchases.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.supplierInvoicesService.cancel(user.tenantId, id);
  }

  @Post(':id/payments')
  @RequirePermissions('finance.purchases.write')
  addPayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateSupplierPaymentDto) {
    return this.supplierInvoicesService.addPayment(user.tenantId, id, user.userId, dto);
  }

  @Get(':id/payments')
  @RequirePermissions('finance.purchases.read')
  findPayments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.supplierInvoicesService.findPayments(user.tenantId, id);
  }
}
