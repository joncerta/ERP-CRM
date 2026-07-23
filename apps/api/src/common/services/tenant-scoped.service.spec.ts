import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantScopedService } from './tenant-scoped.service';
import { TenantScopedEntity } from '../entities/tenant-scoped.entity';

class FakeEntity extends TenantScopedEntity {
  name: string;
}

class FakeService extends TenantScopedService<FakeEntity> {
  constructor(repo: Repository<FakeEntity>) {
    super(repo);
  }
}

function buildQueryBuilderMock() {
  const qb: Record<string, jest.Mock> = {};
  ['where', 'andWhere', 'orderBy', 'skip', 'take'].forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb;
}

function buildRepoMock() {
  const queryBuilder = buildQueryBuilderMock();
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as jest.Mocked<Repository<FakeEntity>>;
  return { repo, queryBuilder };
}

// This is the single property the entire multi-tenant model depends on:
// every lookup must be filtered by tenantId, or one tenant could read or
// write another tenant's data by guessing an id.
describe('TenantScopedService', () => {
  let repo: jest.Mocked<Repository<FakeEntity>>;
  let queryBuilder: ReturnType<typeof buildQueryBuilderMock>;
  let service: FakeService;

  beforeEach(() => {
    ({ repo, queryBuilder } = buildRepoMock());
    service = new FakeService(repo);
  });

  it('findAllForTenant always includes tenantId in the where clause', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAllForTenant('tenant-a');
    expect(repo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a' } });
  });

  it('findAllForTenant merges extra filters but cannot let them override tenantId', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAllForTenant('tenant-a', { tenantId: 'tenant-b' } as never);
    // tenantId spread last in the implementation wins — tenant-a, not the
    // attacker-supplied tenant-b from the "extra" where clause.
    expect(repo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a' } });
  });

  it('findOneForTenant scopes the lookup by tenantId, not just id', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOneForTenant('tenant-a', 'row-1')).rejects.toThrow(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'row-1', tenantId: 'tenant-a' } });
  });

  it('findOneForTenant returns the row when it belongs to the tenant', async () => {
    const row = { id: 'row-1', tenantId: 'tenant-a' } as FakeEntity;
    repo.findOne.mockResolvedValue(row);
    await expect(service.findOneForTenant('tenant-a', 'row-1')).resolves.toBe(row);
  });

  it('removeForTenant 404s instead of deleting when the row belongs to a different tenant', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.removeForTenant('tenant-a', 'row-owned-by-tenant-b')).rejects.toThrow(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  describe('findPaginatedForTenant', () => {
    it('scopes the query builder by tenantId and paginates with defaults', async () => {
      await service.findPaginatedForTenant(
        'tenant-a',
        {},
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'name' },
      );

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('fake');
      expect(queryBuilder.where).toHaveBeenCalledWith('fake.tenantId = :tenantId', { tenantId: 'tenant-a' });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('fake.name', 'DESC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('falls back to defaultSortBy when sortBy is not in the whitelist', async () => {
      await service.findPaginatedForTenant(
        'tenant-a',
        { sortBy: 'tenantId' }, // not whitelisted — would leak cross-tenant ordering info at best, break at worst
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'name' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('fake.name', 'DESC');
    });

    it('honors an allowed sortBy and sortDir', async () => {
      await service.findPaginatedForTenant(
        'tenant-a',
        { sortBy: 'name', sortDir: 'ASC' },
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'createdAt' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('fake.name', 'ASC');
    });

    it('clamps page and pageSize to sane bounds', async () => {
      await service.findPaginatedForTenant(
        'tenant-a',
        { page: -5, pageSize: 10000 },
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'name' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0); // page clamped to 1
      expect(queryBuilder.take).toHaveBeenCalledWith(200); // pageSize clamped to the max
    });

    it('applies a text search across the given columns when provided', async () => {
      await service.findPaginatedForTenant(
        'tenant-a',
        { search: 'acme' },
        { alias: 'fake', searchColumns: ['name'], sortableColumns: ['name'], defaultSortBy: 'name' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.anything());
    });

    it('skips the search clause entirely when no searchColumns are configured', async () => {
      await service.findPaginatedForTenant(
        'tenant-a',
        { search: 'acme' },
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'name' },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('runs custom applyFilters against the query builder', async () => {
      const applyFilters = jest.fn();
      await service.findPaginatedForTenant(
        'tenant-a',
        {},
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'name', applyFilters },
      );
      expect(applyFilters).toHaveBeenCalledWith(queryBuilder);
    });

    it('returns items/total/page/pageSize from the query result', async () => {
      const rows = [{ id: '1' } as FakeEntity];
      queryBuilder.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findPaginatedForTenant(
        'tenant-a',
        { page: 2, pageSize: 10 },
        { alias: 'fake', sortableColumns: ['name'], defaultSortBy: 'name' },
      );

      expect(result).toEqual({ items: rows, total: 1, page: 2, pageSize: 10 });
    });
  });
});
