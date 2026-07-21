import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    // '*' (granted to every tenant's "Administrador" role) covers all
    // tenant-scoped permissions, but never platform.* ones — those manage
    // data across tenants and must be granted explicitly, or any customer
    // admin could see/touch every other tenant on the platform.
    const hasAll = required.every((p) => {
      if (user?.permissions?.includes(p)) return true;
      if (p.startsWith('platform.')) return false;
      return user?.permissions?.includes('*') ?? false;
    });
    if (!hasAll) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    return true;
  }
}
