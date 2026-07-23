import { NotificationEscalationService } from './notification-escalation.service';
import { UsersService } from './users.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { User } from './entities/user.entity';

function buildDeps() {
  const usersService = {
    findManagerOf: jest.fn(),
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const notificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationsService>;
  return { usersService, notificationsService };
}

describe('NotificationEscalationService', () => {
  describe('notifyWithEscalation', () => {
    it('notifies only the actor when they have no manager', async () => {
      const { usersService, notificationsService } = buildDeps();
      usersService.findManagerOf.mockResolvedValue(null);
      const service = new NotificationEscalationService(usersService, notificationsService);

      await service.notifyWithEscalation('tenant-a', 'user-1', 'quote.accepted', 'Title', 'Message', '/quotes');

      expect(notificationsService.notify).toHaveBeenCalledTimes(1);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'quote.accepted',
        'Title',
        'Message',
        '/quotes',
      );
    });

    it('also notifies the direct manager, prefixed with the actor name', async () => {
      const { usersService, notificationsService } = buildDeps();
      usersService.findManagerOf.mockResolvedValue({ id: 'manager-1' } as User);
      usersService.findOneForTenant.mockResolvedValue({ id: 'user-1', fullName: 'Ana Pérez' } as User);
      const service = new NotificationEscalationService(usersService, notificationsService);

      await service.notifyWithEscalation('tenant-a', 'user-1', 'quote.accepted', 'Title', 'Message', '/quotes');

      expect(notificationsService.notify).toHaveBeenCalledTimes(2);
      expect(notificationsService.notify).toHaveBeenNthCalledWith(
        2,
        'tenant-a',
        'manager-1',
        'quote.accepted.escalated',
        'Title',
        'Ana Pérez: Message',
        '/quotes',
      );
    });

    it('falls back to the plain message if the actor lookup somehow misses', async () => {
      const { usersService, notificationsService } = buildDeps();
      usersService.findManagerOf.mockResolvedValue({ id: 'manager-1' } as User);
      usersService.findOneForTenant.mockResolvedValue(null);
      const service = new NotificationEscalationService(usersService, notificationsService);

      await service.notifyWithEscalation('tenant-a', 'user-1', 'quote.accepted', 'Title', 'Message');

      expect(notificationsService.notify).toHaveBeenNthCalledWith(
        2,
        'tenant-a',
        'manager-1',
        'quote.accepted.escalated',
        'Title',
        'Message',
        null,
      );
    });
  });
});
