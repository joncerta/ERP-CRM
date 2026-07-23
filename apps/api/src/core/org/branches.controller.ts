import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('org/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('core.org.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.org.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.branchesService.findPaginated(user.tenantId, query);
    return this.branchesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.org.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('core.org.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.branchesService.remove(user.tenantId, id);
  }
}
