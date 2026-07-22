import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('core.users.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.users.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAllForTenant(user.tenantId);
  }

  @Patch(':id/active')
  @RequirePermissions('core.users.write')
  setActive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetUserActiveDto) {
    if (id === user.userId && !dto.isActive) {
      throw new BadRequestException('No puedes desactivar tu propio usuario');
    }
    return this.usersService.setActive(user.tenantId, id, dto.isActive);
  }
}
