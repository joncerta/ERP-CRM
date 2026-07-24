import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('integrations/api-keys')
@RequireModule('integrations')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @RequirePermissions('integrations.api_keys.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('integrations.api_keys.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.findAllForTenant(user.tenantId);
  }

  @Patch(':id/revoke')
  @RequirePermissions('integrations.api_keys.write')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.apiKeysService.revoke(user.tenantId, id);
  }
}
