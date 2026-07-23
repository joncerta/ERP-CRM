import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('org/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('core.org.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.org.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.departmentsService.findPaginated(user.tenantId, query);
    return this.departmentsService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.org.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('core.org.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departmentsService.remove(user.tenantId, id);
  }
}
