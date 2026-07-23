import { Body, Controller, Get, Patch } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateSessionSettingsDto } from './dto/update-session-settings.dto';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/** Self-service settings a tenant's own admin manages for itself — distinct
 * from the platform-wide tenant management in TenantsController. */
@Controller('tenant-settings')
export class TenantSettingsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    const tenant = await this.tenantsService.findOne(user.tenantId);
    return {
      sessionIdleTimeoutMinutes: tenant.sessionIdleTimeoutMinutes,
      brandingPrimaryColor: tenant.brandingPrimaryColor,
      brandingSecondaryColor: tenant.brandingSecondaryColor,
      brandingLogoData: tenant.brandingLogoData,
      timezone: tenant.timezone,
    };
  }

  @Patch()
  @RequirePermissions('core.tenant.settings.write')
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSessionSettingsDto) {
    const tenant = await this.tenantsService.updateSessionIdleTimeout(user.tenantId, dto.sessionIdleTimeoutMinutes);
    return { sessionIdleTimeoutMinutes: tenant.sessionIdleTimeoutMinutes };
  }

  @Patch('org')
  @RequirePermissions('core.tenant.settings.write')
  async updateOrg(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrgSettingsDto) {
    const tenant = await this.tenantsService.updateOrgSettings(user.tenantId, dto);
    return { timezone: tenant.timezone };
  }
}
