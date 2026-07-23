import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NurtureService } from './nurture.service';
import { CreateNurtureSequenceDto } from './dto/create-nurture-sequence.dto';
import { UpdateNurtureSequenceDto } from './dto/update-nurture-sequence.dto';
import { EnrollContactsDto } from './dto/enroll-contacts.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('marketing/nurture-sequences')
@RequireModule('marketing')
export class NurtureController {
  constructor(private readonly nurtureService: NurtureService) {}

  @Post()
  @RequirePermissions('marketing.nurture.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNurtureSequenceDto) {
    return this.nurtureService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('marketing.nurture.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.nurtureService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('marketing.nurture.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.nurtureService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('marketing.nurture.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateNurtureSequenceDto) {
    return this.nurtureService.update(user.tenantId, id, dto);
  }

  @Post(':id/enroll')
  @RequirePermissions('marketing.nurture.write')
  enroll(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: EnrollContactsDto) {
    return this.nurtureService.enroll(user.tenantId, id, dto.contactIds);
  }

  @Get(':id/enrollments')
  @RequirePermissions('marketing.nurture.read')
  findEnrollments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.nurtureService.findEnrollments(user.tenantId, id);
  }

  @Patch('enrollments/:enrollmentId/cancel')
  @RequirePermissions('marketing.nurture.write')
  cancelEnrollment(@CurrentUser() user: AuthenticatedUser, @Param('enrollmentId') enrollmentId: string) {
    return this.nurtureService.cancelEnrollment(user.tenantId, enrollmentId);
  }

  @Post('process')
  @RequirePermissions('marketing.nurture.write')
  process(@CurrentUser() user: AuthenticatedUser) {
    return this.nurtureService.process(user.tenantId);
  }
}
