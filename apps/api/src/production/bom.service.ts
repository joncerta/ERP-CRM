import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillOfMaterial } from './entities/bill-of-material.entity';
import { BillOfMaterialLine } from './entities/bill-of-material-line.entity';
import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { ProductsService } from '../inventory/products/products.service';

@Injectable()
export class BomService extends TenantScopedService<BillOfMaterial> {
  constructor(
    @InjectRepository(BillOfMaterial) repo: Repository<BillOfMaterial>,
    private readonly productsService: ProductsService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateBomDto): Promise<BillOfMaterial> {
    await this.productsService.findOneForTenant(tenantId, dto.productId);
    for (const line of dto.lines) {
      await this.productsService.findOneForTenant(tenantId, line.componentProductId);
    }
    const bom = this.repository.create({
      tenantId,
      productId: dto.productId,
      name: dto.name,
      outputQuantity: dto.outputQuantity ?? 1,
      notes: dto.notes ?? null,
      lines: dto.lines.map((line) => Object.assign(new BillOfMaterialLine(), line)),
    });
    return this.repository.save(bom);
  }

  async update(tenantId: string, id: string, dto: UpdateBomDto): Promise<BillOfMaterial> {
    const bom = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) bom.name = dto.name;
    if (dto.isActive !== undefined) bom.isActive = dto.isActive;
    if (dto.notes !== undefined) bom.notes = dto.notes;
    if (dto.lines) {
      for (const line of dto.lines) {
        await this.productsService.findOneForTenant(tenantId, line.componentProductId);
      }
      bom.lines = dto.lines.map((line) => Object.assign(new BillOfMaterialLine(), line));
    }
    return this.repository.save(bom);
  }

  findForProduct(tenantId: string, productId: string): Promise<BillOfMaterial[]> {
    return this.repository.find({ where: { tenantId, productId } });
  }
}
