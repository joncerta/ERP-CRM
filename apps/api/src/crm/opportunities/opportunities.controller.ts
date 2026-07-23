import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CloseLostDto } from './dto/close-lost.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/opportunities')
@RequireModule('crm')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  @RequirePermissions('crm.opportunities.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(user.tenantId, dto);
  }

  @Post('from-lead/:leadId')
  @RequirePermissions('crm.opportunities.write')
  createFromLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('leadId') leadId: string,
    @Body() dto: Partial<CreateOpportunityDto>,
  ) {
    return this.opportunitiesService.createFromLead(user.tenantId, leadId, dto);
  }

  @Get()
  @RequirePermissions('crm.opportunities.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('stageId') stageId?: string) {
    if (stageId) return this.opportunitiesService.findByStage(user.tenantId, stageId);
    return this.opportunitiesService.findAllForTenant(user.tenantId);
  }

  @Get('funnel')
  @RequirePermissions('crm.opportunities.read')
  getFunnel(@CurrentUser() user: AuthenticatedUser) {
    return this.opportunitiesService.getFunnel(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('crm.opportunities.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.opportunitiesService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('crm.opportunities.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    return this.opportunitiesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/move-stage')
  @RequirePermissions('crm.opportunities.write')
  moveStage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MoveStageDto) {
    return this.opportunitiesService.moveStage(user.tenantId, id, dto.stageId);
  }

  @Patch(':id/close-lost')
  @RequirePermissions('crm.opportunities.write')
  closeLost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CloseLostDto) {
    return this.opportunitiesService.closeLost(user.tenantId, id, dto.reason);
  }
}
