import { Controller, Get } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('quality/indicators')
@RequireModule('quality')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get()
  @RequirePermissions('quality.inspections.read')
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.indicatorsService.getIndicators(user.tenantId);
  }
}
