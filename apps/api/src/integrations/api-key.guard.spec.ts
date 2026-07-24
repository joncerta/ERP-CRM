import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeysService } from './api-keys.service';
import { ModulesCatalogService } from '../core/modules-catalog/modules-catalog.service';

function buildContext(headers: Record<string, string>) {
  const request: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

function buildGuard() {
  const apiKeysService = {
    findActiveByPlainKey: jest.fn(),
    touchLastUsed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ApiKeysService>;
  const modulesCatalogService = {
    isEnabledForTenant: jest.fn(),
  } as unknown as jest.Mocked<ModulesCatalogService>;
  const guard = new ApiKeyGuard(apiKeysService, modulesCatalogService);
  return { guard, apiKeysService, modulesCatalogService };
}

describe('ApiKeyGuard', () => {
  it('rejects a request with no X-Api-Key header', async () => {
    const { guard } = buildGuard();
    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown or revoked key', async () => {
    const { guard, apiKeysService } = buildGuard();
    apiKeysService.findActiveByPlainKey.mockResolvedValue(null);
    await expect(guard.canActivate(buildContext({ 'x-api-key': 'ak_live_bogus' }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the tenant has disabled the integrations module', async () => {
    const { guard, apiKeysService, modulesCatalogService } = buildGuard();
    apiKeysService.findActiveByPlainKey.mockResolvedValue({ id: 'key-1', tenantId: 'tenant-a', scopes: ['leads:write'] } as any);
    modulesCatalogService.isEnabledForTenant.mockResolvedValue(false);
    await expect(guard.canActivate(buildContext({ 'x-api-key': 'ak_live_valid' }))).rejects.toThrow(ForbiddenException);
  });

  it('attaches publicApiKey to the request and touches lastUsedAt on success', async () => {
    const { guard, apiKeysService, modulesCatalogService } = buildGuard();
    apiKeysService.findActiveByPlainKey.mockResolvedValue({ id: 'key-1', tenantId: 'tenant-a', scopes: ['leads:write'] } as any);
    modulesCatalogService.isEnabledForTenant.mockResolvedValue(true);
    const request: any = { headers: { 'x-api-key': 'ak_live_valid' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.publicApiKey).toEqual({ apiKeyId: 'key-1', tenantId: 'tenant-a', scopes: ['leads:write'] });
    expect(apiKeysService.touchLastUsed).toHaveBeenCalledWith('key-1');
  });
});
