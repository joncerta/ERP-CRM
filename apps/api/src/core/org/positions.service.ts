import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';
import { User } from '../users/entities/user.entity';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

@Injectable()
export class PositionsService extends TenantScopedService<Position> {
  constructor(
    @InjectRepository(Position) repo: Repository<Position>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Position>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'position',
      searchColumns: ['name'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  create(tenantId: string, dto: CreatePositionDto): Promise<Position> {
    const position = this.repository.create({ ...dto, tenantId });
    return this.repository.save(position);
  }

  async update(tenantId: string, id: string, dto: UpdatePositionDto): Promise<Position> {
    const position = await this.findOneForTenant(tenantId, id);
    Object.assign(position, dto);
    return this.repository.save(position);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const position = await this.findOneForTenant(tenantId, id);
    const userCount = await this.usersRepo.count({ where: { tenantId, positionId: id } });
    if (userCount > 0) {
      throw new BadRequestException('No se puede eliminar un cargo con usuarios asignados');
    }
    await this.repository.remove(position);
  }
}
