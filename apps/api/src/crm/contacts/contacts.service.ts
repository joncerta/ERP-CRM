import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class ContactsService extends TenantScopedService<Contact> {
  constructor(@InjectRepository(Contact) repo: Repository<Contact>) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListContactsQueryDto): Promise<Paginated<Contact>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'contact',
      searchColumns: ['firstName', 'lastName', 'email'],
      sortableColumns: ['firstName', 'lastName', 'email', 'createdAt'],
      defaultSortBy: 'firstName',
      applyFilters: (qb) => {
        if (query.companyId) qb.andWhere('contact.companyId = :companyId', { companyId: query.companyId });
      },
    });
  }

  create(tenantId: string, dto: CreateContactDto): Promise<Contact> {
    const contact = this.repository.create({ ...dto, tenantId, companyId: dto.companyId ?? null });
    return this.repository.save(contact);
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOneForTenant(tenantId, id);
    Object.assign(contact, dto);
    return this.repository.save(contact);
  }

  findByCompany(tenantId: string, companyId: string): Promise<Contact[]> {
    return this.repository.find({ where: { tenantId, companyId } });
  }
}
