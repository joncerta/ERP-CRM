import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class WarehousesService extends TenantScopedService<Warehouse> {
  constructor(
    @InjectRepository(Warehouse) repo: Repository<Warehouse>,
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Warehouse>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'warehouse',
      searchColumns: ['name', 'address'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  create(tenantId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    const warehouse = this.repository.create({ ...dto, tenantId });
    return this.repository.save(warehouse);
  }

  async update(tenantId: string, id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.findOneForTenant(tenantId, id);
    Object.assign(warehouse, dto);
    return this.repository.save(warehouse);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const warehouse = await this.findOneForTenant(tenantId, id);
    const movementCount = await this.movementsRepo.count({ where: { tenantId, warehouseId: id } });
    if (movementCount > 0) {
      throw new BadRequestException('No se puede eliminar una bodega con movimientos de inventario registrados');
    }
    await this.repository.remove(warehouse);
  }
}
