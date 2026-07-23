import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions('core.audit.read')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('actorUserId') actorUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditLogsService.findAllForTenant(user.tenantId, {
      actorUserId,
      entityType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('entity-types')
  @RequirePermissions('core.audit.read')
  entityTypes(@CurrentUser() user: AuthenticatedUser) {
    return this.auditLogsService.distinctEntityTypes(user.tenantId);
  }
}
