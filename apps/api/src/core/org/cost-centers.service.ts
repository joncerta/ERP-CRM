import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CostCenter } from './entities/cost-center.entity';
import { Department } from './entities/department.entity';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class CostCentersService extends TenantScopedService<CostCenter> {
  constructor(
    @InjectRepository(CostCenter) repo: Repository<CostCenter>,
    @InjectRepository(Department) private readonly departmentsRepo: Repository<Department>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<CostCenter>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'costCenter',
      searchColumns: ['name', 'code'],
      sortableColumns: ['name', 'code', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  create(tenantId: string, dto: CreateCostCenterDto): Promise<CostCenter> {
    const costCenter = this.repository.create({ ...dto, tenantId });
    return this.repository.save(costCenter);
  }

  async update(tenantId: string, id: string, dto: UpdateCostCenterDto): Promise<CostCenter> {
    const costCenter = await this.findOneForTenant(tenantId, id);
    Object.assign(costCenter, dto);
    return this.repository.save(costCenter);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const costCenter = await this.findOneForTenant(tenantId, id);
    const departmentCount = await this.departmentsRepo.count({ where: { tenantId, costCenterId: id } });
    if (departmentCount > 0) {
      throw new BadRequestException('No se puede eliminar un centro de costo con departamentos asignados');
    }
    await this.repository.remove(costCenter);
  }
}
