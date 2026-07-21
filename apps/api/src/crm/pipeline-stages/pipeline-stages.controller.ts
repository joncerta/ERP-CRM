import { Controller, Get } from '@nestjs/common';
import { PipelineStagesService } from './pipeline-stages.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/pipeline-stages')
@RequireModule('crm')
export class PipelineStagesController {
  constructor(private readonly pipelineStagesService: PipelineStagesService) {}

  @Get()
  @RequirePermissions('crm.opportunities.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.pipelineStagesService.findAllOrdered(user.tenantId);
  }
}
