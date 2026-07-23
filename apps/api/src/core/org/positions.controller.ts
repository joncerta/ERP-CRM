import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('org/positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @RequirePermissions('core.org.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePositionDto) {
    return this.positionsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.org.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.positionsService.findPaginated(user.tenantId, query);
    return this.positionsService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.org.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('core.org.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.positionsService.remove(user.tenantId, id);
  }
}
