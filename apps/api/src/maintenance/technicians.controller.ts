import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('maintenance/technicians')
@RequireModule('maintenance')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @RequirePermissions('maintenance.technicians.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTechnicianDto) {
    return this.techniciansService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('maintenance.technicians.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.techniciansService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('maintenance.technicians.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTechnicianDto) {
    return this.techniciansService.update(user.tenantId, id, dto);
  }
}
