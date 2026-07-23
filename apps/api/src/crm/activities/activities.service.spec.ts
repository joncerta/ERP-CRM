import { Repository } from 'typeorm';
import { ActivitiesService } from './activities.service';
import { Activity, ActivityType } from './entities/activity.entity';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'activity-1', ...data })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<Activity>>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  return { repo, notificationEscalationService };
}

describe('ActivitiesService', () => {
  describe('create', () => {
    it('defaults the owner to the acting user when none is given', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      const service = new ActivitiesService(repo, notificationEscalationService);

      const activity = await service.create('tenant-a', 'user-1', {
        type: ActivityType.NOTE,
        subject: 'Llamada de seguimiento',
      });

      expect(activity.ownerUserId).toBe('user-1');
      expect(notificationEscalationService.notifyWithEscalation).not.toHaveBeenCalled();
    });

    it('escalates a notification when a visit is scheduled', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      const service = new ActivitiesService(repo, notificationEscalationService);

      await service.create('tenant-a', 'user-1', {
        type: ActivityType.VISIT,
        subject: 'Visita al cliente',
        scheduledAt: '2026-08-01T15:00:00.000Z',
      });

      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'activity.visit.scheduled',
        expect.any(String),
        expect.any(String),
        '/activities',
      );
    });

    it('does not escalate a visit with no scheduled date (logged after the fact)', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      const service = new ActivitiesService(repo, notificationEscalationService);

      await service.create('tenant-a', 'user-1', { type: ActivityType.VISIT, subject: 'Visita ya realizada' });

      expect(notificationEscalationService.notifyWithEscalation).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('marks a visit completed and escalates a notification', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      repo.findOne.mockResolvedValue({
        id: 'activity-1',
        tenantId: 'tenant-a',
        type: ActivityType.VISIT,
        ownerUserId: 'user-1',
        subject: 'Visita al cliente',
        completedAt: null,
      } as Activity);
      const service = new ActivitiesService(repo, notificationEscalationService);

      const updated = await service.update('tenant-a', 'activity-1', { completed: true });

      expect(updated.completedAt).toBeInstanceOf(Date);
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'activity.visit.completed',
        expect.any(String),
        expect.any(String),
        '/activities',
      );
    });

    it('does not re-escalate an already-completed visit', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      const completedAt = new Date('2026-01-01T00:00:00.000Z');
      repo.findOne.mockResolvedValue({
        id: 'activity-1',
        tenantId: 'tenant-a',
        type: ActivityType.VISIT,
        ownerUserId: 'user-1',
        completedAt,
      } as Activity);
      const service = new ActivitiesService(repo, notificationEscalationService);

      await service.update('tenant-a', 'activity-1', { completed: true });

      expect(notificationEscalationService.notifyWithEscalation).not.toHaveBeenCalled();
    });

    it('clears completedAt when completed is set to false', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      repo.findOne.mockResolvedValue({
        id: 'activity-1',
        tenantId: 'tenant-a',
        type: ActivityType.TASK,
        ownerUserId: 'user-1',
        completedAt: new Date(),
      } as Activity);
      const service = new ActivitiesService(repo, notificationEscalationService);

      const updated = await service.update('tenant-a', 'activity-1', { completed: false });

      expect(updated.completedAt).toBeNull();
    });
  });

  describe('findAgenda', () => {
    it('queries scheduled, not-yet-completed activities ordered soonest first', async () => {
      const { repo, notificationEscalationService } = buildDeps();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const service = new ActivitiesService(repo, notificationEscalationService);

      await service.findAgenda('tenant-a', 'user-1');

      expect(qb.andWhere).toHaveBeenCalledWith('activity.scheduledAt IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('activity.completedAt IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('activity.ownerUserId = :ownerUserId', { ownerUserId: 'user-1' });
      expect(qb.orderBy).toHaveBeenCalledWith('activity.scheduledAt', 'ASC');
    });
  });
});
