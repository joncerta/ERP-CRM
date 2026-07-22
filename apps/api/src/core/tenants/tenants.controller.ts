import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
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

  // Reached from the login screen before anyone is authenticated — the
  // slug isn't secret (you need it to log in anyway), so this just returns
  // whatever branding is on file, or nulls if the tenant doesn't exist.
  @Public()
  @Get('by-slug/:slug/branding')
  async findBrandingBySlug(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug);
    return {
      primaryColor: tenant?.brandingPrimaryColor ?? null,
      secondaryColor: tenant?.brandingSecondaryColor ?? null,
    };
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

  @RequirePermissions('platform.tenants.manage')
  @Patch(':id/branding')
  updateBranding(@Param('id') id: string, @Body() dto: UpdateTenantBrandingDto) {
    return this.tenantsService.updateBranding(id, dto.primaryColor ?? null, dto.secondaryColor ?? null);
  }
}
