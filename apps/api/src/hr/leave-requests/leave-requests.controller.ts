import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('hr/leave-requests')
@RequireModule('hr')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @RequirePermissions('hr.leave_requests.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveRequestsService.create(user.tenantId, user, dto);
  }

  @Get()
  @RequirePermissions('hr.leave_requests.read')
  findByEmployee(@CurrentUser() user: AuthenticatedUser, @Query('employeeId') employeeId: string) {
    return this.leaveRequestsService.findForEmployee(user.tenantId, employeeId);
  }

  @Get('vacation-balance/:employeeId')
  @RequirePermissions('hr.leave_requests.read')
  vacationBalance(@CurrentUser() user: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.leaveRequestsService.getVacationBalance(user.tenantId, employeeId);
  }

  @Patch(':id/approve')
  @RequirePermissions('hr.leave_requests.write')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReviewLeaveRequestDto) {
    return this.leaveRequestsService.approve(user.tenantId, user, id, dto);
  }

  @Patch(':id/reject')
  @RequirePermissions('hr.leave_requests.write')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReviewLeaveRequestDto) {
    return this.leaveRequestsService.reject(user.tenantId, user, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('hr.leave_requests.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveRequestsService.cancel(user.tenantId, user, id);
  }
}
