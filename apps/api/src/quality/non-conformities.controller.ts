import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NonConformitiesService } from './non-conformities.service';
import { CreateNonConformityDto } from './dto/create-non-conformity.dto';
import { UpdateNonConformityDto } from './dto/update-non-conformity.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('quality/non-conformities')
@RequireModule('quality')
export class NonConformitiesController {
  constructor(private readonly nonConformitiesService: NonConformitiesService) {}

  @Post()
  @RequirePermissions('quality.non_conformities.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNonConformityDto) {
    return this.nonConformitiesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('quality.non_conformities.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.nonConformitiesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('quality.non_conformities.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateNonConformityDto) {
    return this.nonConformitiesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/close')
  @RequirePermissions('quality.non_conformities.write')
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.nonConformitiesService.close(user.tenantId, id);
  }

  @Patch(':id/actions/:actionId')
  @RequirePermissions('quality.non_conformities.write')
  updateAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateActionDto,
  ) {
    return this.nonConformitiesService.updateAction(user.tenantId, id, actionId, dto);
  }
}
