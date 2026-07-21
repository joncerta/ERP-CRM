import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

@Injectable()
export class ContactsService extends TenantScopedService<Contact> {
  constructor(@InjectRepository(Contact) repo: Repository<Contact>) {
    super(repo);
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
