import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SessionsService } from './sessions.service';
import { Session } from './entities/session.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';

function buildRepoMock() {
  return {
    update: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'session-new', ...data })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<Repository<Session>>;
}

function buildGatewayMock() {
  return { pushToUser: jest.fn(), disconnectSessions: jest.fn() } as unknown as jest.Mocked<NotificationsGateway>;
}

describe('SessionsService', () => {
  let repo: jest.Mocked<Repository<Session>>;
  let gateway: jest.Mocked<NotificationsGateway>;
  let service: SessionsService;

  beforeEach(() => {
    repo = buildRepoMock();
    gateway = buildGatewayMock();
    service = new SessionsService(repo, gateway);
  });

  describe('startSession', () => {
    it('revokes every other active session for the user before creating a new one', async () => {
      repo.find.mockResolvedValue([{ id: 'session-old' } as Session]);

      await service.startSession('tenant-a', 'user-1', 'Chrome/1.0');

      expect(repo.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-a', userId: 'user-1', revokedAt: expect.anything() },
        expect.objectContaining({ revokedReason: 'superseded_by_new_login' }),
      );
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-a', userId: 'user-1', userAgent: 'Chrome/1.0', revokedAt: null }),
      );
    });

    it('force-disconnects sockets from every session it revokes, in real time', async () => {
      repo.find.mockResolvedValue([{ id: 'session-old-1' } as Session, { id: 'session-old-2' } as Session]);

      await service.startSession('tenant-a', 'user-1');

      expect(gateway.disconnectSessions).toHaveBeenCalledWith(
        ['session-old-1', 'session-old-2'],
        'superseded_by_new_login',
      );
    });

    it('does not touch the gateway when there is no prior session to kick out', async () => {
      repo.find.mockResolvedValue([]);

      await service.startSession('tenant-a', 'user-1');

      expect(repo.update).not.toHaveBeenCalled();
      expect(gateway.disconnectSessions).not.toHaveBeenCalled();
    });
  });

  describe('touch', () => {
    it('rejects when the session does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.touch('tenant-a', 'missing-session', null)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a revoked session — this is what makes single-session actually kick people out', async () => {
      repo.findOne.mockResolvedValue({
        id: 's1',
        tenantId: 'tenant-a',
        revokedAt: new Date(),
        lastSeenAt: new Date(),
      } as Session);
      await expect(service.touch('tenant-a', 's1', null)).rejects.toThrow(UnauthorizedException);
    });

    it('allows and slides the window forward when there is no idle timeout configured', async () => {
      const oldLastSeen = new Date(Date.now() - 1_000_000_000); // long ago
      repo.findOne.mockResolvedValue({ id: 's1', tenantId: 'tenant-a', revokedAt: null, lastSeenAt: oldLastSeen } as Session);

      await service.touch('tenant-a', 's1', null);

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ revokedAt: null }));
      const saved = repo.save.mock.calls[0][0] as Session;
      expect(saved.lastSeenAt.getTime()).toBeGreaterThan(oldLastSeen.getTime());
    });

    it('rejects and revokes when idle past the configured timeout', async () => {
      const staleLastSeen = new Date(Date.now() - 31 * 60_000); // 31 minutes ago
      repo.findOne.mockResolvedValue({ id: 's1', tenantId: 'tenant-a', revokedAt: null, lastSeenAt: staleLastSeen } as Session);

      await expect(service.touch('tenant-a', 's1', 30)).rejects.toThrow(UnauthorizedException);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ revokedReason: 'idle_timeout' }));
    });

    it('allows when within the configured idle timeout', async () => {
      const recentLastSeen = new Date(Date.now() - 5 * 60_000); // 5 minutes ago
      repo.findOne.mockResolvedValue({ id: 's1', tenantId: 'tenant-a', revokedAt: null, lastSeenAt: recentLastSeen } as Session);

      await expect(service.touch('tenant-a', 's1', 30)).resolves.toBeUndefined();
    });
  });

  describe('revoke', () => {
    it('marks the session revoked with the given reason', async () => {
      await service.revoke('tenant-a', 's1', 'logout');
      expect(repo.update).toHaveBeenCalledWith(
        { id: 's1', tenantId: 'tenant-a' },
        expect.objectContaining({ revokedReason: 'logout' }),
      );
    });
  });
});
