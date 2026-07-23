import { Controller, Get, Query } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentQueryDto } from './dto/segment-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('marketing/segments')
@RequireModule('marketing')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get('contacts')
  @RequirePermissions('marketing.segments.read')
  query(@CurrentUser() user: AuthenticatedUser, @Query() query: SegmentQueryDto) {
    return this.segmentsService.query(user.tenantId, query);
  }
}
