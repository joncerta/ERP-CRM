import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('finance/purchase-orders')
@RequireModule('purchasing')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @RequirePermissions('finance.purchases.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('finance.purchases.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPurchaseOrdersQueryDto) {
    if (query.page) return this.purchaseOrdersService.findPaginated(user.tenantId, query);
    return this.purchaseOrdersService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('finance.purchases.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.purchaseOrdersService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('finance.purchases.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(user.tenantId, id, dto);
  }

  @Patch(':id/send')
  @RequirePermissions('finance.purchases.write')
  send(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.purchaseOrdersService.send(user.tenantId, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('finance.purchases.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.purchaseOrdersService.cancel(user.tenantId, id);
  }

  @Post(':id/receive')
  @RequirePermissions('finance.purchases.write')
  receive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto) {
    return this.purchaseOrdersService.receive(user.tenantId, id, user.userId, dto);
  }
}
