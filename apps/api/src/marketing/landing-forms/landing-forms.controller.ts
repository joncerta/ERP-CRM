import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LandingFormsService } from './landing-forms.service';
import { CreateLandingFormDto } from './dto/create-landing-form.dto';
import { UpdateLandingFormDto } from './dto/update-landing-form.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('marketing/landing-forms')
@RequireModule('marketing')
export class LandingFormsController {
  constructor(private readonly landingFormsService: LandingFormsService) {}

  @Post()
  @RequirePermissions('marketing.landing_forms.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLandingFormDto) {
    return this.landingFormsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('marketing.landing_forms.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.landingFormsService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('marketing.landing_forms.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.landingFormsService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('marketing.landing_forms.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLandingFormDto) {
    return this.landingFormsService.update(user.tenantId, id, dto);
  }
}
