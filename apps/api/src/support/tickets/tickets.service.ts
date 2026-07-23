import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Ticket, TicketStatus, TicketPriority, SLA_HOURS_BY_PRIORITY } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';

const PRIORITY_ORDER = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT];

@Injectable()
export class TicketsService extends TenantScopedService<Ticket> {
  constructor(
    @InjectRepository(Ticket) repo: Repository<Ticket>,
    @InjectRepository(TicketComment) private readonly commentsRepo: Repository<TicketComment>,
    private readonly documentSeriesService: DocumentSeriesService,
    private readonly notificationEscalationService: NotificationEscalationService,
  ) {
    super(repo);
  }

  private nextTicketNumber(tenantId: string): Promise<string> {
    return this.documentSeriesService.consumeNext(tenantId, 'ticket');
  }

  private slaDueAt(priority: TicketPriority, from: Date = new Date()): Date {
    const hours = SLA_HOURS_BY_PRIORITY[priority];
    return new Date(from.getTime() + hours * 60 * 60 * 1000);
  }

  findPaginated(tenantId: string, query: ListTicketsQueryDto): Promise<Paginated<Ticket>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'ticket',
      searchColumns: ['ticketNumber', 'subject'],
      sortableColumns: ['ticketNumber', 'status', 'priority', 'slaDueAt', 'createdAt'],
      defaultSortBy: 'createdAt',
      applyFilters: (qb) => {
        if (query.status) qb.andWhere('ticket.status = :status', { status: query.status });
        if (query.priority) qb.andWhere('ticket.priority = :priority', { priority: query.priority });
        if (query.assignedToUserId) qb.andWhere('ticket.assignedToUserId = :assignedToUserId', { assignedToUserId: query.assignedToUserId });
      },
    });
  }

  async create(tenantId: string, dto: CreateTicketDto): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const ticket = this.repository.create({
      tenantId,
      ticketNumber: await this.nextTicketNumber(tenantId),
      subject: dto.subject,
      description: dto.description,
      priority,
      status: TicketStatus.OPEN,
      contactId: dto.contactId ?? null,
      companyId: dto.companyId ?? null,
      reporterName: null,
      reporterEmail: null,
      accessToken: randomBytes(24).toString('hex'),
      assignedToUserId: null,
      slaDueAt: this.slaDueAt(priority),
    });
    return this.repository.save(ticket);
  }

  /** PQRS entry point — no login required, so priority always starts at
   * MEDIUM (a customer can't self-declare "urgent") and there's no
   * contact/company link unless an agent connects it later. */
  async createPublic(tenantId: string, dto: CreatePublicTicketDto): Promise<Ticket> {
    const ticket = this.repository.create({
      tenantId,
      ticketNumber: await this.nextTicketNumber(tenantId),
      subject: dto.subject,
      description: dto.description,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      contactId: null,
      companyId: null,
      reporterName: dto.reporterName,
      reporterEmail: dto.reporterEmail,
      accessToken: randomBytes(24).toString('hex'),
      assignedToUserId: null,
      slaDueAt: this.slaDueAt(TicketPriority.MEDIUM),
    });
    return this.repository.save(ticket);
  }

  findByAccessToken(accessToken: string): Promise<Ticket> {
    return this.repository.findOne({ where: { accessToken } }).then((ticket) => {
      if (!ticket) throw new BadRequestException('Ticket no encontrado');
      return ticket;
    });
  }

  async update(tenantId: string, id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOneForTenant(tenantId, id);
    if (dto.subject !== undefined) ticket.subject = dto.subject;
    if (dto.description !== undefined) ticket.description = dto.description;
    return this.repository.save(ticket);
  }

  async assign(tenantId: string, id: string, assigneeUserId: string): Promise<Ticket> {
    const ticket = await this.findOneForTenant(tenantId, id);
    ticket.assignedToUserId = assigneeUserId;
    const saved = await this.repository.save(ticket);

    await this.notificationEscalationService.notifyWithEscalation(
      tenantId,
      assigneeUserId,
      'ticket.assigned',
      'Ticket asignado',
      `Se te asignó el ticket ${ticket.ticketNumber}: ${ticket.subject}`,
      '/support/tickets',
    );

    return saved;
  }

  /** Bumps priority one level and pushes the SLA target out from now —
   * used when an agent decides a ticket needs more urgency than it was
   * filed with. */
  async escalate(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.findOneForTenant(tenantId, id);
    const currentIndex = PRIORITY_ORDER.indexOf(ticket.priority);
    if (currentIndex === PRIORITY_ORDER.length - 1) {
      throw new BadRequestException('Este ticket ya está en la prioridad más alta');
    }
    ticket.priority = PRIORITY_ORDER[currentIndex + 1];
    ticket.slaDueAt = this.slaDueAt(ticket.priority);
    const saved = await this.repository.save(ticket);

    if (ticket.assignedToUserId) {
      await this.notificationEscalationService.notifyWithEscalation(
        tenantId,
        ticket.assignedToUserId,
        'ticket.escalated',
        'Ticket escalado',
        `El ticket ${ticket.ticketNumber} se escaló a prioridad ${ticket.priority}.`,
        '/support/tickets',
      );
    }

    return saved;
  }

  async updateStatus(tenantId: string, id: string, status: TicketStatus): Promise<Ticket> {
    const ticket = await this.findOneForTenant(tenantId, id);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Este ticket ya está cerrado');
    }
    ticket.status = status;
    if (status === TicketStatus.RESOLVED && !ticket.resolvedAt) ticket.resolvedAt = new Date();
    if (status === TicketStatus.CLOSED) ticket.closedAt = new Date();
    return this.repository.save(ticket);
  }

  async addComment(tenantId: string, ticketId: string, authorUserId: string | null, dto: CreateTicketCommentDto): Promise<TicketComment> {
    await this.findOneForTenant(tenantId, ticketId);
    return this.commentsRepo.save(
      this.commentsRepo.create({
        tenantId,
        ticketId,
        authorUserId,
        body: dto.body,
        isInternal: dto.isInternal ?? false,
      }),
    );
  }

  findComments(tenantId: string, ticketId: string, includeInternal: boolean): Promise<TicketComment[]> {
    return this.commentsRepo.find({
      where: includeInternal ? { tenantId, ticketId } : { tenantId, ticketId, isInternal: false },
      order: { createdAt: 'ASC' },
    });
  }
}
