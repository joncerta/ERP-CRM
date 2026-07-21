import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleEnabledGuard } from './module-enabled.guard';
import { ModulesCatalogService } from '../../core/modules-catalog/modules-catalog.service';

function buildContext(tenantId = 'tenant-1'): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { tenantId } }) }),
  } as unknown as ExecutionContext;
}

describe('ModuleEnabledGuard', () => {
  let reflector: Reflector;
  let modulesCatalogService: { isEnabledForTenant: jest.Mock };
  let guard: ModuleEnabledGuard;

  beforeEach(() => {
    reflector = new Reflector();
    modulesCatalogService = { isEnabledForTenant: jest.fn() };
    guard = new ModuleEnabledGuard(reflector, modulesCatalogService as unknown as ModulesCatalogService);
  });

  it('allows the request when the route requires no module', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(modulesCatalogService.isEnabledForTenant).not.toHaveBeenCalled();
  });

  it('allows the request when the module is enabled for the tenant', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('crm');
    modulesCatalogService.isEnabledForTenant.mockResolvedValue(true);
    await expect(guard.canActivate(buildContext('tenant-1'))).resolves.toBe(true);
    expect(modulesCatalogService.isEnabledForTenant).toHaveBeenCalledWith('tenant-1', 'crm');
  });

  it('blocks the request when the module is disabled for the tenant', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('crm');
    modulesCatalogService.isEnabledForTenant.mockResolvedValue(false);
    await expect(guard.canActivate(buildContext('tenant-1'))).rejects.toThrow(ForbiddenException);
  });
});
