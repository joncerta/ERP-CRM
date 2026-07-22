import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, AuthenticatedUser } from '../auth.types';
import { SessionsService } from '../../sessions/sessions.service';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly sessionsService: SessionsService,
    private readonly tenantsService: TenantsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Throws (→ 401) if the session was revoked — logged out, superseded
    // by a login elsewhere, or idle past the tenant's configured timeout.
    const tenant = await this.tenantsService.findOne(payload.tenantId);
    await this.sessionsService.touch(payload.tenantId, payload.sid, tenant.sessionIdleTimeoutMinutes);

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      roleId: payload.roleId,
      permissions: payload.permissions,
      sessionId: payload.sid,
    };
  }
}
