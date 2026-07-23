import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class BranchesService extends TenantScopedService<Branch> {
  constructor(
    @InjectRepository(Branch) repo: Repository<Branch>,
    @InjectRepository(Department) private readonly departmentsRepo: Repository<Department>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Branch>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'branch',
      searchColumns: ['name', 'code', 'address'],
      sortableColumns: ['name', 'code', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  async create(tenantId: string, dto: CreateBranchDto): Promise<Branch> {
    if (dto.isDefault) await this.clearOtherDefaults(tenantId);
    const branch = this.repository.create({ ...dto, tenantId, isDefault: dto.isDefault ?? false });
    return this.repository.save(branch);
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOneForTenant(tenantId, id);
    if (dto.isDefault) await this.clearOtherDefaults(tenantId, id);
    Object.assign(branch, dto);
    return this.repository.save(branch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const branch = await this.findOneForTenant(tenantId, id);
    const departmentCount = await this.departmentsRepo.count({ where: { tenantId, branchId: id } });
    if (departmentCount > 0) {
      throw new BadRequestException('No se puede eliminar una sucursal con departamentos asignados');
    }
    await this.repository.remove(branch);
  }

  private async clearOtherDefaults(tenantId: string, exceptId?: string): Promise<void> {
    const qb = this.repository
      .createQueryBuilder()
      .update(Branch)
      .set({ isDefault: false })
      .where('tenant_id = :tenantId', { tenantId });
    if (exceptId) qb.andWhere('id != :exceptId', { exceptId });
    await qb.execute();
  }
}
