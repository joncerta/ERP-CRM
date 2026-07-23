import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/leads')
@RequireModule('crm')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermissions('crm.leads.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('crm.leads.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListLeadsQueryDto) {
    if (query.page) return this.leadsService.findPaginated(user.tenantId, query);
    return this.leadsService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('crm.leads.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leadsService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('crm.leads.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.leads.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leadsService.removeForTenant(user.tenantId, id);
  }
}
