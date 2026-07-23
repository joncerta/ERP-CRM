import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('org/cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @RequirePermissions('core.org.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCostCenterDto) {
    return this.costCentersService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.org.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.costCentersService.findPaginated(user.tenantId, query);
    return this.costCentersService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.org.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCostCenterDto) {
    return this.costCentersService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('core.org.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.costCentersService.remove(user.tenantId, id);
  }
}
