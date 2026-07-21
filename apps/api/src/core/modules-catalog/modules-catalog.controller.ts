import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ModulesCatalogService } from './modules-catalog.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SetModuleEnabledDto } from './dto/set-module-enabled.dto';

@Controller('modules')
export class ModulesCatalogController {
  constructor(private readonly modulesCatalogService: ModulesCatalogService) {}

  @Get('catalog')
  findAllDefinitions() {
    return this.modulesCatalogService.findAllDefinitions();
  }

  @Get('enabled')
  findEnabledForTenant(@CurrentUser() user: AuthenticatedUser) {
    return this.modulesCatalogService.findEnabledForTenant(user.tenantId);
  }

  @Post(':code')
  @RequirePermissions('core.modules.write')
  setEnabled(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
    @Body() dto: SetModuleEnabledDto,
  ) {
    return this.modulesCatalogService.setEnabled(user.tenantId, code, dto.isEnabled);
  }
}
