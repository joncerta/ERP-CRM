import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ModulesCatalogService } from '../core/modules-catalog/modules-catalog.service';

export interface PublicApiPrincipal {
  apiKeyId: string;
  tenantId: string;
  scopes: string[];
}

/** Authenticates PublicApiController requests via the X-Api-Key header —
 * a separate pathway from the JWT used everywhere else, since an external
 * integration has no user session to log into. Deliberately does not
 * touch `request.user`: that shape is reserved for real logged-in users,
 * and mixing the two would let a public API key accidentally satisfy an
 * internal @RequirePermissions check it was never meant to.
 *
 * Also re-checks that the tenant still has the "integrations" module
 * enabled — @RequireModule/ModuleEnabledGuard never runs here since this
 * controller is @Public() (no JWT, no request.user for it to read), so
 * without this an admin turning the module off wouldn't actually cut off
 * existing keys, only hide the management UI. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly modulesCatalogService: ModulesCatalogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'];
    if (!providedKey || typeof providedKey !== 'string') {
      throw new UnauthorizedException('Falta el encabezado X-Api-Key');
    }

    const apiKey = await this.apiKeysService.findActiveByPlainKey(providedKey);
    if (!apiKey) {
      throw new UnauthorizedException('Clave de API inválida o revocada');
    }

    const moduleEnabled = await this.modulesCatalogService.isEnabledForTenant(apiKey.tenantId, 'integrations');
    if (!moduleEnabled) {
      throw new ForbiddenException('El módulo "integrations" no está activo para esta empresa');
    }

    await this.apiKeysService.touchLastUsed(apiKey.id);
    request.publicApiKey = { apiKeyId: apiKey.id, tenantId: apiKey.tenantId, scopes: apiKey.scopes } satisfies PublicApiPrincipal;
    return true;
  }
}
