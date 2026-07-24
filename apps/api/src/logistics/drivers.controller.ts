import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('logistics/drivers')
@RequireModule('logistics')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @RequirePermissions('logistics.drivers.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDriverDto) {
    return this.driversService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('logistics.drivers.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.driversService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('logistics.drivers.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(user.tenantId, id, dto);
  }
}
