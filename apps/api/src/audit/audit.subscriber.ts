import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { RequestContext } from '../common/context/request-context';

/**
 * Listens to every entity in the app (TypeORM gives subscribers with no
 * listenTo() override every insert/update/remove, regardless of type) and
 * writes an AuditLog row for the ones that are tenant-scoped. This is what
 * makes "audit everything" possible without every service remembering to
 * log itself — add a new entity, it's covered automatically as long as it
 * carries a tenantId column.
 */
@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<unknown>): Promise<void> {
    if (!this.shouldAudit(event.metadata.target)) return;
    const entity = event.entity as Record<string, unknown> | undefined;
    const tenantId = this.tenantIdOf(entity);
    if (!entity || !tenantId) return;

    await this.write(event.manager, {
      tenantId,
      entityType: event.metadata.name,
      entityId: (entity.id as string) ?? null,
      action: 'create',
      changes: this.snapshot(entity),
    });
  }

  async afterUpdate(event: UpdateEvent<unknown>): Promise<void> {
    if (!this.shouldAudit(event.metadata.target)) return;
    const entity = event.entity as Record<string, unknown> | undefined;
    const before = event.databaseEntity as Record<string, unknown> | undefined;
    const tenantId = this.tenantIdOf(entity) ?? this.tenantIdOf(before);
    if (!entity || !tenantId) return;

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const column of event.updatedColumns) {
      const prop = column.propertyName;
      if (prop === 'updatedAt') continue;
      const beforeValue = before?.[prop];
      const afterValue = entity[prop];
      if (beforeValue === afterValue) continue;
      changes[prop] = { before: beforeValue ?? null, after: afterValue ?? null };
    }
    if (Object.keys(changes).length === 0) return;

    await this.write(event.manager, {
      tenantId,
      entityType: event.metadata.name,
      entityId: (entity.id as string) ?? null,
      action: 'update',
      changes,
    });
  }

  async afterRemove(event: RemoveEvent<unknown>): Promise<void> {
    if (!this.shouldAudit(event.metadata.target)) return;
    const entity = (event.entity ?? event.databaseEntity) as Record<string, unknown> | undefined;
    const tenantId = this.tenantIdOf(entity);
    if (!entity || !tenantId) return;

    await this.write(event.manager, {
      tenantId,
      entityType: event.metadata.name,
      entityId: (entity.id as string) ?? (event.entityId as string) ?? null,
      action: 'delete',
      changes: this.snapshot(entity),
    });
  }

  private shouldAudit(target: Function | string): boolean {
    return target !== AuditLog;
  }

  private tenantIdOf(entity: Record<string, unknown> | undefined): string | null {
    const value = entity?.tenantId;
    return typeof value === 'string' ? value : null;
  }

  /** Full field snapshot for create/delete — there's no "before" to diff
   * against, so the whole row is the useful record. */
  private snapshot(entity: Record<string, unknown>): Record<string, unknown> {
    const { tenantId: _tenantId, ...rest } = entity;
    return rest;
  }

  private async write(
    manager: EntityManager,
    row: {
      tenantId: string;
      entityType: string;
      entityId: string | null;
      action: 'create' | 'update' | 'delete';
      changes: Record<string, unknown>;
    },
  ): Promise<void> {
    const context = RequestContext.get();
    try {
      await manager.getRepository(AuditLog).insert({
        tenantId: row.tenantId,
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        actorUserId: context?.userId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changes: row.changes as any,
      });
    } catch (err) {
      // Auditing must never take down the actual business operation it's
      // observing — log and move on rather than rethrow.
      this.logger.error(`Failed to write audit log for ${row.entityType} ${row.entityId}`, err as Error);
    }
  }
}
