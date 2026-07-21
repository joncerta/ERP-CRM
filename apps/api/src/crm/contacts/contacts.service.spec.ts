import { Repository } from 'typeorm';
import { ContactsService } from './contacts.service';
import { Contact } from './entities/contact.entity';

function buildRepoMock() {
  return {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'new-id', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Contact>>;
}

describe('ContactsService', () => {
  let repo: jest.Mocked<Repository<Contact>>;
  let service: ContactsService;

  beforeEach(() => {
    repo = buildRepoMock();
    service = new ContactsService(repo);
  });

  it('stamps the tenantId on create and stores companyId as null when omitted', async () => {
    await service.create('tenant-a', { firstName: 'Maria' } as never);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Maria', tenantId: 'tenant-a', companyId: null }),
    );
  });

  it('keeps the provided companyId on create', async () => {
    await service.create('tenant-a', { firstName: 'Maria', companyId: 'company-1' } as never);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'company-1' }));
  });

  it('findByCompany scopes by tenant as well as company, not company alone', async () => {
    repo.find.mockResolvedValue([]);
    await service.findByCompany('tenant-a', 'company-1');
    expect(repo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', companyId: 'company-1' } });
  });
});
