import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class SuppliersService extends TenantScopedService<Supplier> {
  constructor(@InjectRepository(Supplier) repo: Repository<Supplier>) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Supplier>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'supplier',
      searchColumns: ['name', 'taxId', 'email'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  create(tenantId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.repository.create({
      tenantId,
      name: dto.name,
      taxId: dto.taxId ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });
    return this.repository.save(supplier);
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) supplier.name = dto.name;
    if (dto.taxId !== undefined) supplier.taxId = dto.taxId;
    if (dto.email !== undefined) supplier.email = dto.email;
    if (dto.phone !== undefined) supplier.phone = dto.phone;
    if (dto.address !== undefined) supplier.address = dto.address;
    if (dto.isActive !== undefined) supplier.isActive = dto.isActive;
    return this.repository.save(supplier);
  }
}
