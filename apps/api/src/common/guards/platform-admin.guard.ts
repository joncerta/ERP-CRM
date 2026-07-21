import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards the endpoints used to provision tenants and their first admin user.
 * There's no logged-in user yet at that point (chicken-and-egg), so instead
 * of a full platform-admin auth system we gate it behind a shared secret
 * only the platform operator holds. Fine for the manual-onboarding MVP;
 * revisit if/when self-service signup is built.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-platform-admin-key'];
    const expected = this.config.get<string>('PLATFORM_ADMIN_KEY');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Clave de administración de plataforma inválida');
    }
    return true;
  }
}
