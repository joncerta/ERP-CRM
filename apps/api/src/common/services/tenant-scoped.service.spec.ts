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

function buildRepoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<Repository<FakeEntity>>;
}

// This is the single property the entire multi-tenant model depends on:
// every lookup must be filtered by tenantId, or one tenant could read or
// write another tenant's data by guessing an id.
describe('TenantScopedService', () => {
  let repo: jest.Mocked<Repository<FakeEntity>>;
  let service: FakeService;

  beforeEach(() => {
    repo = buildRepoMock();
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
});
