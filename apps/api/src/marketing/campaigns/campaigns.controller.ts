import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('marketing/campaigns')
@RequireModule('marketing')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @RequirePermissions('marketing.campaigns.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('marketing.campaigns.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.campaignsService.findPaginated(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('marketing.campaigns.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('marketing.campaigns.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('marketing.campaigns.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.cancel(user.tenantId, id);
  }

  @Post(':id/send')
  @RequirePermissions('marketing.campaigns.write')
  send(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SendCampaignDto) {
    return this.campaignsService.send(user.tenantId, user.userId, id, dto);
  }

  @Get(':id/recipients')
  @RequirePermissions('marketing.campaigns.read')
  findRecipients(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.findRecipients(user.tenantId, id);
  }
}
