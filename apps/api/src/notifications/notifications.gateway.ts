import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { corsOriginCheck } from '../common/cors-origin';
import type { JwtPayload } from '../core/auth/auth.types';
import type { Notification } from './entities/notification.entity';

function userRoom(tenantId: string, userId: string): string {
  return `tenant:${tenantId}:user:${userId}`;
}

function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

/**
 * Auth here only checks the JWT is validly signed and unexpired — it does
 * NOT re-check session revocation on every reconnect (that would require
 * depending on SessionsService, which itself depends on this gateway to
 * push the "kicked out" event, so keeping this one-directional avoids a
 * module cycle). A session that gets revoked while a socket is still open
 * is force-disconnected explicitly via disconnectSessions() instead.
 */
@WebSocketGateway({ cors: { origin: corsOriginCheck, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      });
      await client.join(userRoom(payload.tenantId, payload.sub));
      await client.join(sessionRoom(payload.sid));
    } catch {
      client.disconnect(true);
    }
  }

  pushToUser(tenantId: string, userId: string, notification: Notification): void {
    this.server.to(userRoom(tenantId, userId)).emit('notification:new', notification);
  }

  disconnectSessions(sessionIds: string[], reason: string): void {
    for (const sessionId of sessionIds) {
      const room = sessionRoom(sessionId);
      this.server.to(room).emit('session:revoked', { reason });
      this.server.in(room).disconnectSockets(true);
    }
  }
}
