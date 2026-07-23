import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceAdjustmentDto } from './dto/create-invoice-adjustment.dto';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { CreateRecurringTemplateDto } from './dto/create-recurring-template.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('finance/invoices')
@RequireModule('sales_invoicing')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermissions('finance.invoices.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user.tenantId, user.userId, dto);
  }

  @Post('from-quote/:quoteId')
  @RequirePermissions('finance.invoices.write')
  createFromQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('quoteId') quoteId: string,
    @Body('issueDate') issueDate: string,
  ) {
    return this.invoicesService.createFromQuote(user.tenantId, user.userId, quoteId, issueDate);
  }

  @Get()
  @RequirePermissions('finance.invoices.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    if (query.page) return this.invoicesService.findPaginated(user.tenantId, query);
    return this.invoicesService.findAllForTenant(user.tenantId);
  }

  @Get('recurring-templates')
  @RequirePermissions('finance.invoices.read')
  findTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.findTemplates(user.tenantId);
  }

  @Post('recurring-templates')
  @RequirePermissions('finance.invoices.write')
  createTemplate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecurringTemplateDto) {
    return this.invoicesService.createTemplate(user.tenantId, user.userId, dto);
  }

  @Patch('recurring-templates/:id/active')
  @RequirePermissions('finance.invoices.write')
  setTemplateActive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.invoicesService.setTemplateActive(user.tenantId, id, isActive);
  }

  @Post('recurring-templates/:id/generate')
  @RequirePermissions('finance.invoices.write')
  generateFromTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('issueDate') issueDate: string,
  ) {
    return this.invoicesService.generateFromTemplate(user.tenantId, id, issueDate);
  }

  @Get(':id')
  @RequirePermissions('finance.invoices.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('finance.invoices.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/issue')
  @RequirePermissions('finance.invoices.write')
  issue(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.issue(user.tenantId, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('finance.invoices.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.cancel(user.tenantId, id);
  }

  @Post(':id/adjustments')
  @RequirePermissions('finance.invoices.write')
  addAdjustment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateInvoiceAdjustmentDto) {
    return this.invoicesService.addAdjustment(user.tenantId, id, user.userId, dto);
  }

  @Get(':id/adjustments')
  @RequirePermissions('finance.invoices.read')
  findAdjustments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findAdjustments(user.tenantId, id);
  }

  @Post(':id/payments')
  @RequirePermissions('finance.invoices.write')
  addPayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateInvoicePaymentDto) {
    return this.invoicesService.addPayment(user.tenantId, id, user.userId, dto);
  }

  @Get(':id/payments')
  @RequirePermissions('finance.invoices.read')
  findPayments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findPayments(user.tenantId, id);
  }

  @Post(':id/send-reminder')
  @RequirePermissions('finance.invoices.write')
  sendReminder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.sendReminder(user.tenantId, id);
  }
}
