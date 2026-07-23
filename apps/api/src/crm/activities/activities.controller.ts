import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/activities')
@RequireModule('crm')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @RequirePermissions('crm.activities.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('crm.activities.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListActivitiesQueryDto) {
    if (query.page) return this.activitiesService.findPaginated(user.tenantId, query);
    return this.activitiesService.findAllForTenant(user.tenantId, {
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.opportunityId ? { opportunityId: query.opportunityId } : {}),
    } as never);
  }

  @Get('agenda')
  @RequirePermissions('crm.activities.read')
  findAgenda(@CurrentUser() user: AuthenticatedUser, @Query('onlyMine') onlyMine?: string) {
    return this.activitiesService.findAgenda(user.tenantId, onlyMine === 'true' ? user.userId : undefined);
  }

  @Patch(':id')
  @RequirePermissions('crm.activities.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.activities.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.activitiesService.removeForTenant(user.tenantId, id);
  }
}
