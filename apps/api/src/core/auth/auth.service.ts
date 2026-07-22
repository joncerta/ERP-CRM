import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { SessionsService } from '../sessions/sessions.service';
import { EmailService } from '../../common/email/email.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly sessionsService: SessionsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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

  /** Always resolves the same way regardless of whether the tenant/email
   * exist — the response can't be used to probe valid accounts. */
  async forgotPassword(tenantSlug: string, email: string): Promise<void> {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    if (!tenant || !tenant.isActive) return;

    const result = await this.usersService.requestPasswordReset(tenant.id, email);
    if (!result) return;

    const webOrigin = (this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${webOrigin}/reset-password/${result.token}`;

    await this.emailService.send({
      to: result.user.email,
      subject: 'Restablece tu contraseña',
      html: `<p>Hola ${result.user.fullName},</p><p>Recibimos una solicitud para restablecer tu contraseña. Este enlace vence en 1 hora:</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Si no fuiste tú, puedes ignorar este correo.</p>`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.resetPassword(token, newPassword);
    // A password reset should immediately invalidate any session that
    // might still be active — e.g. if the reset was because of a stolen
    // password, whoever had it shouldn't stay logged in.
    await this.sessionsService.revokeAllActive(user.tenantId, user.id, 'password_reset');
  }
}
