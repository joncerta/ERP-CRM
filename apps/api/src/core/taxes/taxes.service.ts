import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from './entities/tax.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class TaxesService extends TenantScopedService<Tax> {
  constructor(@InjectRepository(Tax) repo: Repository<Tax>) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Tax>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'tax',
      searchColumns: ['name'],
      sortableColumns: ['name', 'rate', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  /** Only one tax may be the tenant's default at a time — setting a new
   * one automatically clears the flag on whichever tax had it before. */
  private async clearExistingDefault(tenantId: string, exceptId?: string): Promise<void> {
    const current = await this.repository.find({ where: { tenantId, isDefault: true } });
    for (const tax of current) {
      if (tax.id === exceptId) continue;
      tax.isDefault = false;
      await this.repository.save(tax);
    }
  }

  async create(tenantId: string, dto: CreateTaxDto): Promise<Tax> {
    const existing = await this.repository.findOne({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException(`Ya existe un impuesto "${dto.name}"`);

    const tax = await this.repository.save(
      this.repository.create({ tenantId, name: dto.name, rate: dto.rate, isDefault: dto.isDefault ?? false }),
    );
    if (tax.isDefault) {
      await this.clearExistingDefault(tenantId, tax.id);
    }
    return tax;
  }

  async update(tenantId: string, id: string, dto: UpdateTaxDto): Promise<Tax> {
    const tax = await this.findOneForTenant(tenantId, id);
    if (dto.name && dto.name !== tax.name) {
      const existing = await this.repository.findOne({ where: { tenantId, name: dto.name } });
      if (existing) throw new ConflictException(`Ya existe un impuesto "${dto.name}"`);
    }
    if (dto.name !== undefined) tax.name = dto.name;
    if (dto.rate !== undefined) tax.rate = dto.rate;
    if (dto.isActive !== undefined) tax.isActive = dto.isActive;
    if (dto.isDefault !== undefined) tax.isDefault = dto.isDefault;
    const saved = await this.repository.save(tax);
    if (saved.isDefault) {
      await this.clearExistingDefault(tenantId, saved.id);
    }
    return saved;
  }

  findDefault(tenantId: string): Promise<Tax | null> {
    return this.repository.findOne({ where: { tenantId, isDefault: true, isActive: true } });
  }
}
