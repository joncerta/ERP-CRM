import { AuditSubscriber } from './audit.subscriber';
import { AuditLog } from './entities/audit-log.entity';
import { RequestContext } from '../common/context/request-context';

function buildSubscriber() {
  const dataSource = { subscribers: [] as unknown[] } as any;
  const subscriber = new AuditSubscriber(dataSource);
  const insert = jest.fn().mockResolvedValue(undefined);
  const manager = { getRepository: jest.fn().mockReturnValue({ insert }) } as any;
  return { subscriber, manager, insert };
}

describe('AuditSubscriber', () => {
  it('registers itself with the DataSource on construction', () => {
    const dataSource = { subscribers: [] as unknown[] } as any;
    const subscriber = new AuditSubscriber(dataSource);
    expect(dataSource.subscribers).toContain(subscriber);
  });

  describe('afterInsert', () => {
    it('logs a create action with a full snapshot for a tenant-scoped entity', async () => {
      const { subscriber, manager, insert } = buildSubscriber();

      await RequestContext.run({ tenantId: 'tenant-a', userId: 'user-1' }, () =>
        subscriber.afterInsert({
          manager,
          metadata: { target: {}, name: 'Contact' },
          entity: { id: 'c1', tenantId: 'tenant-a', firstName: 'Ana' },
        } as any),
      );

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-a',
          entityType: 'Contact',
          entityId: 'c1',
          action: 'create',
          actorUserId: 'user-1',
          changes: { id: 'c1', firstName: 'Ana' },
        }),
      );
    });

    it('skips entities with no tenantId (not tenant-scoped)', async () => {
      const { subscriber, manager, insert } = buildSubscriber();

      await subscriber.afterInsert({
        manager,
        metadata: { target: {}, name: 'Currency' },
        entity: { code: 'USD' },
      } as any);

      expect(insert).not.toHaveBeenCalled();
    });

    it('never audits writes to AuditLog itself, to avoid an infinite loop', async () => {
      const { subscriber, manager, insert } = buildSubscriber();

      await subscriber.afterInsert({
        manager,
        metadata: { target: AuditLog, name: 'AuditLog' },
        entity: { id: 'a1', tenantId: 'tenant-a' },
      } as any);

      expect(insert).not.toHaveBeenCalled();
    });
  });

  describe('afterUpdate', () => {
    it('logs only the columns that actually changed, with before/after values', async () => {
      const { subscriber, manager, insert } = buildSubscriber();

      await RequestContext.run({ tenantId: 'tenant-a', userId: 'user-1' }, () =>
        subscriber.afterUpdate({
          manager,
          metadata: { target: {}, name: 'Product' },
          entity: { id: 'p1', tenantId: 'tenant-a', salePrice: 150, name: 'Widget' },
          databaseEntity: { id: 'p1', tenantId: 'tenant-a', salePrice: 100, name: 'Widget' },
          updatedColumns: [{ propertyName: 'salePrice' }, { propertyName: 'updatedAt' }],
        } as any),
      );

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          changes: { salePrice: { before: 100, after: 150 } },
        }),
      );
    });

    it('skips writing anything when the only updated column is updatedAt', async () => {
      const { subscriber, manager, insert } = buildSubscriber();

      await subscriber.afterUpdate({
        manager,
        metadata: { target: {}, name: 'Product' },
        entity: { id: 'p1', tenantId: 'tenant-a' },
        databaseEntity: { id: 'p1', tenantId: 'tenant-a' },
        updatedColumns: [{ propertyName: 'updatedAt' }],
      } as any);

      expect(insert).not.toHaveBeenCalled();
    });
  });

  describe('afterRemove', () => {
    it('logs a delete action with the removed entity as the snapshot', async () => {
      const { subscriber, manager, insert } = buildSubscriber();

      await RequestContext.run({ tenantId: 'tenant-a', userId: 'user-1' }, () =>
        subscriber.afterRemove({
          manager,
          metadata: { target: {}, name: 'Warehouse' },
          entity: { id: 'w1', tenantId: 'tenant-a', name: 'Bodega Norte' },
          databaseEntity: undefined,
          entityId: 'w1',
        } as any),
      );

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          entityId: 'w1',
          changes: { id: 'w1', name: 'Bodega Norte' },
        }),
      );
    });
  });

  it('swallows a write failure instead of letting it bubble up', async () => {
    const { subscriber, manager, insert } = buildSubscriber();
    insert.mockRejectedValueOnce(new Error('db down'));

    await expect(
      subscriber.afterInsert({
        manager,
        metadata: { target: {}, name: 'Contact' },
        entity: { id: 'c1', tenantId: 'tenant-a' },
      } as any),
    ).resolves.toBeUndefined();
  });
});
