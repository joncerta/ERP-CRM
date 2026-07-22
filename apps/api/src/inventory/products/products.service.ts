import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

@Injectable()
export class ProductsService extends TenantScopedService<Product> {
  constructor(
    @InjectRepository(Product) repo: Repository<Product>,
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateProductDto): Promise<Product> {
    const existing = await this.repository.findOne({ where: { tenantId, sku: dto.sku } });
    if (existing) {
      throw new ConflictException(`Ya existe un producto con el SKU "${dto.sku}"`);
    }
    const product = this.repository.create({ ...dto, tenantId });
    return this.repository.save(product);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneForTenant(tenantId, id);
    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.repository.findOne({ where: { tenantId, sku: dto.sku } });
      if (existing) throw new ConflictException(`Ya existe un producto con el SKU "${dto.sku}"`);
    }
    Object.assign(product, dto);
    return this.repository.save(product);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const product = await this.findOneForTenant(tenantId, id);
    const movementCount = await this.movementsRepo.count({ where: { tenantId, productId: id } });
    if (movementCount > 0) {
      throw new BadRequestException('No se puede eliminar un producto con movimientos de inventario registrados');
    }
    await this.repository.remove(product);
  }
}
