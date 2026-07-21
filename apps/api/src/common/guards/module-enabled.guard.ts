import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_MODULE_KEY } from '../decorators/require-module.decorator';
import { ModulesCatalogService } from '../../core/modules-catalog/modules-catalog.service';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

/**
 * Blocks access to a module's endpoints when the tenant hasn't activated it,
 * so a disabled module is unreachable even if someone guesses the route.
 */
@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modulesCatalogService: ModulesCatalogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleCode = this.reflector.getAllAndOverride<string>(REQUIRED_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleCode) return true;

    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    const enabled = await this.modulesCatalogService.isEnabledForTenant(user.tenantId, moduleCode);
    if (!enabled) {
      throw new ForbiddenException(`El módulo "${moduleCode}" no está activo para esta empresa`);
    }
    return true;
  }
}
