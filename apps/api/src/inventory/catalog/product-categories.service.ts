import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class ProductCategoriesService extends TenantScopedService<ProductCategory> {
  constructor(
    @InjectRepository(ProductCategory) repo: Repository<ProductCategory>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<ProductCategory>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'category',
      searchColumns: ['name'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  async create(tenantId: string, dto: CreateCategoryDto): Promise<ProductCategory> {
    const existing = await this.repository.findOne({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException(`Ya existe una categoría "${dto.name}"`);
    const category = this.repository.create({ ...dto, tenantId });
    return this.repository.save(category);
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto): Promise<ProductCategory> {
    const category = await this.findOneForTenant(tenantId, id);
    if (dto.name && dto.name !== category.name) {
      const existing = await this.repository.findOne({ where: { tenantId, name: dto.name } });
      if (existing) throw new ConflictException(`Ya existe una categoría "${dto.name}"`);
    }
    Object.assign(category, dto);
    return this.repository.save(category);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const category = await this.findOneForTenant(tenantId, id);
    const productCount = await this.productsRepo.count({ where: { tenantId, categoryId: id } });
    if (productCount > 0) {
      throw new BadRequestException('No se puede eliminar una categoría en uso por productos');
    }
    await this.repository.remove(category);
  }
}
