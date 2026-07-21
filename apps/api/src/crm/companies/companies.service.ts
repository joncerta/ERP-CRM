import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

@Injectable()
export class CompaniesService extends TenantScopedService<Company> {
  constructor(@InjectRepository(Company) repo: Repository<Company>) {
    super(repo);
  }

  create(tenantId: string, dto: CreateCompanyDto): Promise<Company> {
    const company = this.repository.create({ ...dto, tenantId });
    return this.repository.save(company);
  }

  async update(tenantId: string, id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOneForTenant(tenantId, id);
    Object.assign(company, dto);
    return this.repository.save(company);
  }
}
