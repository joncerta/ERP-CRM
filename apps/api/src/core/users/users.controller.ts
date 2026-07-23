import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionsService } from '../sessions/sessions.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { AssignUserOrgDto } from '../org/dto/assign-user-org.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post()
  @RequirePermissions('core.users.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.users.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.usersService.findPaginated(user.tenantId, query);
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

  @Patch(':id/org')
  @RequirePermissions('core.org.write')
  assignOrg(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignUserOrgDto) {
    return this.usersService.assignOrg(user.tenantId, id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeOwnPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changeOwnPassword(user.tenantId, user.userId, dto.currentPassword, dto.newPassword);
    // Forces re-login everywhere, including this same request's session —
    // consistent "changing your password logs you out" behavior.
    await this.sessionsService.revokeAllActive(user.tenantId, user.userId, 'password_changed');
  }
}
