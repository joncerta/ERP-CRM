import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ModulesCatalogService } from '../modules-catalog/modules-catalog.service';
import { SetModuleEnabledDto } from '../modules-catalog/dto/set-module-enabled.dto';

@Controller('platform/tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly modulesCatalogService: ModulesCatalogService,
  ) {}

  // Bootstraps a brand new tenant + its admin user — no session exists yet
  // at this point, so it's gated by the shared platform key instead of a
  // logged-in permission.
  @Public()
  @UseGuards(PlatformAdminGuard)
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  // Everything below is for the platform admin panel: a logged-in user
  // with the platform.tenants.manage permission managing every tenant.
  @RequirePermissions('platform.tenants.manage')
  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @RequirePermissions('platform.tenants.manage')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @RequirePermissions('platform.tenants.manage')
  @Get(':id/modules')
  findModules(@Param('id') id: string) {
    return this.modulesCatalogService.findStatusForTenant(id);
  }

  @RequirePermissions('platform.tenants.manage')
  @Patch(':id/modules/:code')
  setModule(@Param('id') id: string, @Param('code') code: string, @Body() dto: SetModuleEnabledDto) {
    return this.modulesCatalogService.setEnabled(id, code, dto.isEnabled);
  }
}
