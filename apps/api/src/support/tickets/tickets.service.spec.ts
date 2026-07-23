import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { Ticket, TicketStatus, TicketPriority } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'ticket-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Ticket>>;
  const commentsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'comment-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<TicketComment>>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('TK-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  return { repo, commentsRepo, documentSeriesService, notificationEscalationService };
}

function buildService() {
  const deps = buildDeps();
  const service = new TicketsService(deps.repo, deps.commentsRepo, deps.documentSeriesService, deps.notificationEscalationService);
  return { service, ...deps };
}

describe('TicketsService', () => {
  describe('create', () => {
    it('computes the SLA deadline from priority and claims a number from the document series', async () => {
      const { service, documentSeriesService } = buildService();
      const before = Date.now();

      const ticket = await service.create('tenant-a', {
        subject: 'No prende el equipo',
        description: 'Detalle...',
        priority: TicketPriority.URGENT,
      });

      expect(documentSeriesService.consumeNext).toHaveBeenCalledWith('tenant-a', 'ticket');
      expect(ticket).toMatchObject({ ticketNumber: 'TK-000001', status: TicketStatus.OPEN, priority: TicketPriority.URGENT });
      const slaMs = (ticket.slaDueAt as Date).getTime() - before;
      expect(slaMs).toBeGreaterThan(3.9 * 60 * 60 * 1000);
      expect(slaMs).toBeLessThan(4.1 * 60 * 60 * 1000);
    });
  });

  describe('createPublic', () => {
    it('always starts at MEDIUM priority regardless of what the reporter might want', async () => {
      const { service } = buildService();

      const ticket = await service.createPublic('tenant-a', {
        subject: 'Reclamo',
        description: 'Detalle...',
        reporterName: 'Cliente Externo',
        reporterEmail: 'cliente@example.com',
      });

      expect(ticket).toMatchObject({ priority: TicketPriority.MEDIUM, reporterEmail: 'cliente@example.com' });
    });
  });

  describe('escalate', () => {
    it('bumps the priority one level and pushes the SLA target out', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'ticket-1',
        tenantId: 'tenant-a',
        ticketNumber: 'TK-000001',
        priority: TicketPriority.MEDIUM,
        assignedToUserId: 'user-1',
      } as Ticket);

      const ticket = await service.escalate('tenant-a', 'ticket-1');

      expect(ticket.priority).toBe(TicketPriority.HIGH);
    });

    it('refuses to escalate a ticket already at the highest priority', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'ticket-1',
        tenantId: 'tenant-a',
        priority: TicketPriority.URGENT,
      } as Ticket);

      await expect(service.escalate('tenant-a', 'ticket-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('stamps resolvedAt when moving to resolved', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'ticket-1', tenantId: 'tenant-a', status: TicketStatus.OPEN, resolvedAt: null } as Ticket);

      const ticket = await service.updateStatus('tenant-a', 'ticket-1', TicketStatus.RESOLVED);

      expect(ticket.status).toBe(TicketStatus.RESOLVED);
      expect(ticket.resolvedAt).toBeInstanceOf(Date);
    });

    it('refuses to change the status of a closed ticket', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'ticket-1', tenantId: 'tenant-a', status: TicketStatus.CLOSED } as Ticket);

      await expect(service.updateStatus('tenant-a', 'ticket-1', TicketStatus.OPEN)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assign', () => {
    it('escalates a notification to the assignee', async () => {
      const { service, repo, notificationEscalationService } = buildService();
      repo.findOne.mockResolvedValue({ id: 'ticket-1', tenantId: 'tenant-a', ticketNumber: 'TK-000001', subject: 'Algo' } as Ticket);

      await service.assign('tenant-a', 'ticket-1', 'user-2');

      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-2',
        'ticket.assigned',
        expect.any(String),
        expect.any(String),
        '/support/tickets',
      );
    });
  });
});
