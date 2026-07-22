import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly repo: Repository<Session>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Revokes every active session for this user and force-disconnects their
   * sockets right away, instead of waiting for their next HTTP request to
   * hit the 401. Shared by single-session enforcement (a login elsewhere)
   * and anything that should immediately invalidate existing sessions,
   * like a password change/reset.
   */
  async revokeAllActive(tenantId: string, userId: string, reason: string): Promise<void> {
    const priorActive = await this.repo.find({ where: { tenantId, userId, revokedAt: IsNull() } });
    if (priorActive.length === 0) return;

    await this.repo.update({ tenantId, userId, revokedAt: IsNull() }, { revokedAt: new Date(), revokedReason: reason });
    this.notificationsGateway.disconnectSessions(
      priorActive.map((s) => s.id),
      reason,
    );
  }

  /**
   * Revokes every other active session for this user, then opens a new
   * one — enforcing "logging in on a new device immediately kicks out
   * every other device" without a separate cleanup job.
   */
  async startSession(tenantId: string, userId: string, userAgent?: string): Promise<Session> {
    await this.revokeAllActive(tenantId, userId, 'superseded_by_new_login');

    const session = this.repo.create({
      tenantId,
      userId,
      userAgent: userAgent ?? null,
      lastSeenAt: new Date(),
      revokedAt: null,
    });
    return this.repo.save(session);
  }

  /**
   * Called on every authenticated request. Confirms the session backing
   * the presented JWT is still active, applies the tenant's idle timeout
   * (if any), and slides the window forward. Throws instead of returning
   * false so a single call site in the JWT strategy can just await it.
   */
  async touch(tenantId: string, sessionId: string, idleTimeoutMinutes: number | null): Promise<void> {
    const session = await this.repo.findOne({ where: { id: sessionId, tenantId } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Sesión inválida o cerrada en otro dispositivo');
    }

    if (idleTimeoutMinutes != null) {
      const idleMs = Date.now() - session.lastSeenAt.getTime();
      if (idleMs > idleTimeoutMinutes * 60_000) {
        session.revokedAt = new Date();
        session.revokedReason = 'idle_timeout';
        await this.repo.save(session);
        throw new UnauthorizedException('Sesión expirada por inactividad');
      }
    }

    session.lastSeenAt = new Date();
    await this.repo.save(session);
  }

  async revoke(tenantId: string, sessionId: string, reason: string): Promise<void> {
    await this.repo.update({ id: sessionId, tenantId }, { revokedAt: new Date(), revokedReason: reason });
  }
}
