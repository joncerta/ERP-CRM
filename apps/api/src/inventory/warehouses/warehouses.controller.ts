import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('inventory/warehouses')
@RequireModule('inventory')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @RequirePermissions('inventory.warehouses.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('inventory.warehouses.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.warehousesService.findPaginated(user.tenantId, query);
    return this.warehousesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('inventory.warehouses.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.warehouses.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.warehousesService.remove(user.tenantId, id);
  }
}
