import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('maintenance/work-orders')
@RequireModule('maintenance')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @RequirePermissions('maintenance.work_orders.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('maintenance.work_orders.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workOrdersService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('maintenance.work_orders.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(user.tenantId, id, dto);
  }

  @Patch(':id/start')
  @RequirePermissions('maintenance.work_orders.write')
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workOrdersService.start(user.tenantId, id);
  }

  @Patch(':id/complete')
  @RequirePermissions('maintenance.work_orders.write')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteWorkOrderDto) {
    return this.workOrdersService.complete(user.tenantId, user.userId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('maintenance.work_orders.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workOrdersService.cancel(user.tenantId, id);
  }
}
