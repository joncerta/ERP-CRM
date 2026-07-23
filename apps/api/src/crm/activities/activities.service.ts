import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityType } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';

@Injectable()
export class ActivitiesService extends TenantScopedService<Activity> {
  constructor(
    @InjectRepository(Activity) repo: Repository<Activity>,
    private readonly notificationEscalationService: NotificationEscalationService,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListActivitiesQueryDto): Promise<Paginated<Activity>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'activity',
      searchColumns: ['subject'],
      sortableColumns: ['subject', 'type', 'scheduledAt', 'createdAt'],
      defaultSortBy: 'createdAt',
      applyFilters: (qb) => {
        if (query.contactId) qb.andWhere('activity.contactId = :contactId', { contactId: query.contactId });
        if (query.leadId) qb.andWhere('activity.leadId = :leadId', { leadId: query.leadId });
        if (query.opportunityId) qb.andWhere('activity.opportunityId = :opportunityId', { opportunityId: query.opportunityId });
        if (query.ownerUserId) qb.andWhere('activity.ownerUserId = :ownerUserId', { ownerUserId: query.ownerUserId });
        if (query.type) qb.andWhere('activity.type = :type', { type: query.type });
      },
    });
  }

  /** Scheduled activities not yet completed, soonest first — the
   * "commercial agenda" view. Optionally scoped to one user. */
  findAgenda(tenantId: string, ownerUserId?: string): Promise<Activity[]> {
    const qb = this.repository
      .createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.scheduledAt IS NOT NULL')
      .andWhere('activity.completedAt IS NULL')
      .orderBy('activity.scheduledAt', 'ASC');
    if (ownerUserId) qb.andWhere('activity.ownerUserId = :ownerUserId', { ownerUserId });
    return qb.getMany();
  }

  async create(tenantId: string, actingUserId: string, dto: CreateActivityDto): Promise<Activity> {
    const activity = this.repository.create({
      ...dto,
      tenantId,
      ownerUserId: dto.ownerUserId ?? actingUserId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
    const saved = await this.repository.save(activity);

    if (saved.type === ActivityType.VISIT && saved.scheduledAt) {
      await this.notificationEscalationService.notifyWithEscalation(
        tenantId,
        saved.ownerUserId,
        'activity.visit.scheduled',
        'Visita agendada',
        `Se agendó la visita "${saved.subject}" para ${saved.scheduledAt.toLocaleString()}.`,
        '/activities',
      );
    }

    return saved;
  }

  async update(tenantId: string, id: string, dto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.findOneForTenant(tenantId, id);
    const { completed, scheduledAt, ...rest } = dto;
    Object.assign(activity, rest);
    if (scheduledAt !== undefined) activity.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    const wasCompleted = !!activity.completedAt;
    if (completed === true) activity.completedAt = activity.completedAt ?? new Date();
    if (completed === false) activity.completedAt = null;

    const saved = await this.repository.save(activity);

    if (saved.type === ActivityType.VISIT && completed === true && !wasCompleted) {
      await this.notificationEscalationService.notifyWithEscalation(
        tenantId,
        saved.ownerUserId,
        'activity.visit.completed',
        'Visita completada',
        `Se completó la visita "${saved.subject}".`,
        '/activities',
      );
    }

    return saved;
  }
}
