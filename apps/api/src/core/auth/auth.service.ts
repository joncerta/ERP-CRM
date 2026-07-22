import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { SessionsService } from '../sessions/sessions.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, userAgent?: string): Promise<{ accessToken: string }> {
    const tenant = await this.tenantsService.findBySlug(dto.tenantSlug);
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Empresa no encontrada o inactiva');
    }

    const user = await this.usersService.findByEmail(tenant.id, dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await UsersService.verifyPassword(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Kicks out any other device/browser this user was logged in on —
    // single-session is enforced here, not by checking on every request.
    const session = await this.sessionsService.startSession(tenant.id, user.id, userAgent);

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      roleId: user.roleId,
      permissions: user.role?.permissions ?? [],
      sid: session.id,
    };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  async logout(tenantId: string, sessionId: string): Promise<void> {
    await this.sessionsService.revoke(tenantId, sessionId, 'logout');
  }
}
