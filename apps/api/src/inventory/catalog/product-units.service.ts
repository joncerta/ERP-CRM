import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductUnit } from './entities/product-unit.entity';
import { Product } from '../products/entities/product.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class ProductUnitsService extends TenantScopedService<ProductUnit> {
  constructor(
    @InjectRepository(ProductUnit) repo: Repository<ProductUnit>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<ProductUnit>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'unit',
      searchColumns: ['name'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  async create(tenantId: string, dto: CreateUnitDto): Promise<ProductUnit> {
    const existing = await this.repository.findOne({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException(`Ya existe una unidad "${dto.name}"`);
    const unit = this.repository.create({ ...dto, tenantId });
    return this.repository.save(unit);
  }

  async update(tenantId: string, id: string, dto: UpdateUnitDto): Promise<ProductUnit> {
    const unit = await this.findOneForTenant(tenantId, id);
    if (dto.name && dto.name !== unit.name) {
      const existing = await this.repository.findOne({ where: { tenantId, name: dto.name } });
      if (existing) throw new ConflictException(`Ya existe una unidad "${dto.name}"`);
    }
    Object.assign(unit, dto);
    return this.repository.save(unit);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const unit = await this.findOneForTenant(tenantId, id);
    const productCount = await this.productsRepo.count({ where: { tenantId, unitId: id } });
    if (productCount > 0) {
      throw new BadRequestException('No se puede eliminar una unidad en uso por productos');
    }
    await this.repository.remove(unit);
  }
}
