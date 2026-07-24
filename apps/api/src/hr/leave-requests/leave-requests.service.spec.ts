import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest, LeaveRequestStatus, LeaveType } from './entities/leave-request.entity';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../../core/users/entities/user.entity';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'leave-1', ...data })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<LeaveRequest>>;
  const employeesRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Employee>>;
  const usersRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<User>>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  const notificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationsService>;
  return { repo, employeesRepo, usersRepo, notificationEscalationService, notificationsService };
}

function buildService() {
  const deps = buildDeps();
  const service = new LeaveRequestsService(
    deps.repo,
    deps.employeesRepo,
    deps.usersRepo,
    deps.notificationEscalationService,
    deps.notificationsService,
  );
  return { service, ...deps };
}

function actingUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { userId: 'user-1', tenantId: 'tenant-a', email: 'a@b.com', roleId: 'role-1', permissions: [], sessionId: 's1', ...overrides };
}

describe('LeaveRequestsService', () => {
  describe('create', () => {
    it('lets an employee request their own leave and notifies their manager with escalation', async () => {
      const { service, employeesRepo, notificationEscalationService } = buildService();
      employeesRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-a', userId: 'user-1' } as Employee);

      const request = await service.create('tenant-a', actingUser(), {
        employeeId: 'emp-1',
        type: LeaveType.VACATION,
        startDate: '2026-08-01',
        endDate: '2026-08-05',
      });

      expect(request).toMatchObject({ daysRequested: 5, status: LeaveRequestStatus.PENDING });
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'hr.leave_request',
        expect.any(String),
        expect.any(String),
        '/hr',
      );
    });

    it('refuses to let a regular employee request leave on someone else\'s behalf', async () => {
      const { service, employeesRepo } = buildService();
      employeesRepo.findOne.mockResolvedValue({ id: 'emp-2', tenantId: 'tenant-a', userId: 'user-2' } as Employee);

      await expect(
        service.create('tenant-a', actingUser({ userId: 'user-1', permissions: ['hr.leave_requests.write'] }), {
          employeeId: 'emp-2',
          type: LeaveType.VACATION,
          startDate: '2026-08-01',
          endDate: '2026-08-05',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a full admin to file a request on someone else\'s behalf', async () => {
      const { service, employeesRepo } = buildService();
      employeesRepo.findOne.mockResolvedValue({ id: 'emp-2', tenantId: 'tenant-a', userId: 'user-2' } as Employee);

      await expect(
        service.create('tenant-a', actingUser({ userId: 'admin-1', permissions: ['*'] }), {
          employeeId: 'emp-2',
          type: LeaveType.VACATION,
          startDate: '2026-08-01',
          endDate: '2026-08-05',
        }),
      ).resolves.toMatchObject({ employeeId: 'emp-2' });
    });

    it('refuses an end date before the start date', async () => {
      const { service, employeesRepo } = buildService();
      employeesRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-a', userId: 'user-1' } as Employee);

      await expect(
        service.create('tenant-a', actingUser(), { employeeId: 'emp-1', type: LeaveType.VACATION, startDate: '2026-08-05', endDate: '2026-08-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('lets the employee\'s direct manager approve, and notifies the employee back', async () => {
      const { service, repo, employeesRepo, usersRepo, notificationsService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'req-1',
        tenantId: 'tenant-a',
        employeeId: 'emp-1',
        status: LeaveRequestStatus.PENDING,
        startDate: '2026-08-01',
        endDate: '2026-08-05',
      } as unknown as LeaveRequest);
      employeesRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-a', userId: 'user-2' } as Employee);
      usersRepo.findOne.mockResolvedValue({ id: 'user-2', tenantId: 'tenant-a', managerId: 'manager-1' } as User);

      const approved = await service.approve('tenant-a', actingUser({ userId: 'manager-1' }), 'req-1', {});

      expect(approved.status).toBe(LeaveRequestStatus.APPROVED);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-a',
        'user-2',
        'hr.leave_request.approved',
        expect.any(String),
        expect.any(String),
        '/hr',
      );
    });

    it('refuses to let someone who is not the manager (or an admin) approve', async () => {
      const { service, repo, employeesRepo, usersRepo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'req-1',
        tenantId: 'tenant-a',
        employeeId: 'emp-1',
        status: LeaveRequestStatus.PENDING,
      } as unknown as LeaveRequest);
      employeesRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-a', userId: 'user-2' } as Employee);
      usersRepo.findOne.mockResolvedValue({ id: 'user-2', tenantId: 'tenant-a', managerId: 'manager-1' } as User);

      await expect(service.approve('tenant-a', actingUser({ userId: 'someone-else' }), 'req-1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getVacationBalance', () => {
    it('prorates earned days from the hire date and subtracts approved vacation days taken', async () => {
      const { service, employeesRepo, repo } = buildService();
      const hireDate = new Date();
      hireDate.setDate(hireDate.getDate() - 360); // exactly one year of service
      employeesRepo.findOne.mockResolvedValue({
        id: 'emp-1',
        tenantId: 'tenant-a',
        hireDate: hireDate.toISOString().slice(0, 10),
        vacationDaysPerYear: 15,
      } as Employee);
      (repo.find as jest.Mock).mockResolvedValue([{ daysRequested: 5 } as LeaveRequest]);

      const balance = await service.getVacationBalance('tenant-a', 'emp-1');

      expect(balance.earned).toBe(15);
      expect(balance.taken).toBe(5);
      expect(balance.balance).toBe(10);
    });
  });
});
