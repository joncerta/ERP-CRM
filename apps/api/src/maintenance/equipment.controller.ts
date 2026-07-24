import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { WorkOrdersService } from './work-orders.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('maintenance/equipment')
@RequireModule('maintenance')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  @Post()
  @RequirePermissions('maintenance.equipment.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('maintenance.equipment.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.equipmentService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('maintenance.equipment.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(user.tenantId, id, dto);
  }

  @Get(':id/history')
  @RequirePermissions('maintenance.work_orders.read')
  history(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workOrdersService.findForEquipment(user.tenantId, id);
  }
}
