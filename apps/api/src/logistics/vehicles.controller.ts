import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { DeliveryNotesService } from './delivery-notes.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('logistics/vehicles')
@RequireModule('logistics')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly deliveryNotesService: DeliveryNotesService,
  ) {}

  @Post()
  @RequirePermissions('logistics.vehicles.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('logistics.vehicles.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.vehiclesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('logistics.vehicles.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(user.tenantId, id, dto);
  }

  @Get(':id/deliveries')
  @RequirePermissions('logistics.delivery_notes.read')
  deliveries(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveryNotesService.findForVehicle(user.tenantId, id);
  }
}
