import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateAuditDto } from './dto/update-audit.dto';
import { CompleteAuditDto } from './dto/complete-audit.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('quality/audits')
@RequireModule('quality')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  @RequirePermissions('quality.audits.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAuditDto) {
    return this.auditsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('quality.audits.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.auditsService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('quality.audits.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAuditDto) {
    return this.auditsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/complete')
  @RequirePermissions('quality.audits.write')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteAuditDto) {
    return this.auditsService.complete(user.tenantId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('quality.audits.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.auditsService.cancel(user.tenantId, id);
  }
}
