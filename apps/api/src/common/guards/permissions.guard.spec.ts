import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function buildContext(user: { permissions: string[] } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function withRequired(permissions: string[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);
  }

  it('allows the request when the route has no @RequirePermissions', () => {
    withRequired(undefined);
    expect(guard.canActivate(buildContext({ permissions: [] }))).toBe(true);
  });

  it('allows a user holding the exact permission', () => {
    withRequired(['crm.leads.write']);
    expect(guard.canActivate(buildContext({ permissions: ['crm.leads.write'] }))).toBe(true);
  });

  it("allows a wildcard '*' role for an ordinary tenant-scoped permission", () => {
    withRequired(['crm.leads.write']);
    expect(guard.canActivate(buildContext({ permissions: ['*'] }))).toBe(true);
  });

  it('denies a user missing the required permission', () => {
    withRequired(['crm.leads.write']);
    expect(() => guard.canActivate(buildContext({ permissions: ['crm.leads.read'] }))).toThrow(ForbiddenException);
  });

  it("never lets '*' satisfy a platform.* permission — a tenant admin must not manage other tenants", () => {
    withRequired(['platform.tenants.manage']);
    expect(() => guard.canActivate(buildContext({ permissions: ['*'] }))).toThrow(ForbiddenException);
  });

  it('allows platform.* only when granted explicitly', () => {
    withRequired(['platform.tenants.manage']);
    expect(guard.canActivate(buildContext({ permissions: ['*', 'platform.tenants.manage'] }))).toBe(true);
  });

  it('denies when there is no authenticated user on the request', () => {
    withRequired(['crm.leads.write']);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
