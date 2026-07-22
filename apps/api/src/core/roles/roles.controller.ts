import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('core.roles.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.roles.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.roles.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('core.roles.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rolesService.removeRole(user.tenantId, id);
  }
}
