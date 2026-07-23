import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { User } from '../users/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class DepartmentsService extends TenantScopedService<Department> {
  constructor(
    @InjectRepository(Department) repo: Repository<Department>,
    @InjectRepository(Position) private readonly positionsRepo: Repository<Position>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Department>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'department',
      searchColumns: ['name'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  create(tenantId: string, dto: CreateDepartmentDto): Promise<Department> {
    const department = this.repository.create({ ...dto, tenantId });
    return this.repository.save(department);
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOneForTenant(tenantId, id);
    Object.assign(department, dto);
    return this.repository.save(department);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const department = await this.findOneForTenant(tenantId, id);
    const [positionCount, userCount] = await Promise.all([
      this.positionsRepo.count({ where: { tenantId, departmentId: id } }),
      this.usersRepo.count({ where: { tenantId, departmentId: id } }),
    ]);
    if (positionCount > 0 || userCount > 0) {
      throw new BadRequestException('No se puede eliminar un departamento con cargos o usuarios asignados');
    }
    await this.repository.remove(department);
  }
}
