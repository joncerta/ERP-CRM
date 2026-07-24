import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { CompleteProductionOrderDto } from './dto/complete-production-order.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('production/orders')
@RequireModule('production')
export class ProductionOrdersController {
  constructor(private readonly ordersService: ProductionOrdersService) {}

  @Post()
  @RequirePermissions('production.orders.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductionOrderDto) {
    return this.ordersService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('production.orders.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAllForTenant(user.tenantId);
  }

  @Get(':id/consumptions')
  @RequirePermissions('production.orders.read')
  findConsumptions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.findConsumptions(user.tenantId, id);
  }

  @Patch(':id/start')
  @RequirePermissions('production.orders.write')
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.start(user.tenantId, user.userId, id);
  }

  @Patch(':id/complete')
  @RequirePermissions('production.orders.write')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteProductionOrderDto) {
    return this.ordersService.complete(user.tenantId, user.userId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('production.orders.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.cancel(user.tenantId, id);
  }
}
