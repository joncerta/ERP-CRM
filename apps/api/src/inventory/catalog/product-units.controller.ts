import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductUnitsService } from './product-units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('inventory/units')
@RequireModule('inventory')
export class ProductUnitsController {
  constructor(private readonly unitsService: ProductUnitsService) {}

  @Post()
  @RequirePermissions('inventory.products.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('inventory.products.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.unitsService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('inventory.products.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.products.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.unitsService.remove(user.tenantId, id);
  }
}
