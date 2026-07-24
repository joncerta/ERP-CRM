import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PerformanceReviewsService } from './performance-reviews.service';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { UpdatePerformanceReviewDto } from './dto/update-performance-review.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('hr/performance-reviews')
@RequireModule('hr')
export class PerformanceReviewsController {
  constructor(private readonly performanceReviewsService: PerformanceReviewsService) {}

  @Post()
  @RequirePermissions('hr.performance.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePerformanceReviewDto) {
    return this.performanceReviewsService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('hr.performance.read')
  findByEmployee(@CurrentUser() user: AuthenticatedUser, @Query('employeeId') employeeId: string) {
    return this.performanceReviewsService.findForEmployee(user.tenantId, employeeId);
  }

  @Patch(':id')
  @RequirePermissions('hr.performance.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePerformanceReviewDto) {
    return this.performanceReviewsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/submit')
  @RequirePermissions('hr.performance.write')
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.performanceReviewsService.submit(user.tenantId, id);
  }
}
