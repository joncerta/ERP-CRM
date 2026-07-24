import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('quality/inspections')
@RequireModule('quality')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  @RequirePermissions('quality.inspections.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInspectionDto) {
    return this.inspectionsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('quality.inspections.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.inspectionsService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('quality.inspections.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateInspectionDto) {
    return this.inspectionsService.update(user.tenantId, id, dto);
  }
}
