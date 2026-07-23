import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../crm/contacts/entities/contact.entity';
import { Company } from '../../crm/companies/entities/company.entity';
import { SegmentQueryDto } from './dto/segment-query.dto';

/** Reuses the existing Company (industry/city/employeeCount) and Contact
 * (position) columns instead of a new segmentation schema — a segment is
 * just a filtered contact list, computed on demand rather than stored. */
@Injectable()
export class SegmentsService {
  constructor(
    @InjectRepository(Contact) private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(Company) private readonly companiesRepo: Repository<Company>,
  ) {}

  async query(tenantId: string, query: SegmentQueryDto): Promise<{ items: Array<Contact & { company: Company | null }>; total: number }> {
    const qb = this.contactsRepo
      .createQueryBuilder('contact')
      .leftJoinAndMapOne('contact.company', Company, 'company', 'company.id = contact.companyId AND company.tenantId = contact.tenantId')
      .where('contact.tenantId = :tenantId', { tenantId });

    if (query.position) qb.andWhere('contact.position ILIKE :position', { position: `%${query.position}%` });
    if (query.industry) qb.andWhere('company.industry ILIKE :industry', { industry: `%${query.industry}%` });
    if (query.city) qb.andWhere('company.city ILIKE :city', { city: `%${query.city}%` });
    if (query.minEmployees !== undefined) qb.andWhere('company.employeeCount >= :minEmployees', { minEmployees: query.minEmployees });
    if (query.maxEmployees !== undefined) qb.andWhere('company.employeeCount <= :maxEmployees', { maxEmployees: query.maxEmployees });

    const [items, total] = await qb.getManyAndCount();
    return { items: items as Array<Contact & { company: Company | null }>, total };
  }
}
