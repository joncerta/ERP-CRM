import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

function buildRepoMock() {
  return {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'notif-1', createdAt: new Date(), isRead: false, ...data })),
    find: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<Notification>>;
}

function buildGatewayMock() {
  return { pushToUser: jest.fn(), disconnectSessions: jest.fn() } as unknown as jest.Mocked<NotificationsGateway>;
}

describe('NotificationsService', () => {
  let repo: jest.Mocked<Repository<Notification>>;
  let gateway: jest.Mocked<NotificationsGateway>;
  let service: NotificationsService;

  beforeEach(() => {
    repo = buildRepoMock();
    gateway = buildGatewayMock();
    service = new NotificationsService(repo, gateway);
  });

  describe('notify', () => {
    it('persists the notification and pushes it to the user in real time', async () => {
      const result = await service.notify('tenant-a', 'user-1', 'quote.accepted', 'Título', 'Mensaje', '/quotes');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-a',
          userId: 'user-1',
          type: 'quote.accepted',
          title: 'Título',
          message: 'Mensaje',
          link: '/quotes',
        }),
      );
      expect(gateway.pushToUser).toHaveBeenCalledWith('tenant-a', 'user-1', result);
    });
  });

  describe('findForUser', () => {
    it('scopes to the tenant and user, newest first', async () => {
      await service.findForUser('tenant-a', 'user-1');
      expect(repo.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-a', userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });

  describe('markRead', () => {
    it('only updates the notification if it belongs to this tenant and user', async () => {
      await service.markRead('tenant-a', 'user-1', 'notif-1');
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'notif-1', tenantId: 'tenant-a', userId: 'user-1' },
        { isRead: true },
      );
    });
  });

  describe('markAllRead', () => {
    it('marks every unread notification for this user as read', async () => {
      await service.markAllRead('tenant-a', 'user-1');
      expect(repo.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-a', userId: 'user-1', isRead: false },
        { isRead: true },
      );
    });
  });
});
