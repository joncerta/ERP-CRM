import { NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TenantScopedEntity } from '../entities/tenant-scoped.entity';

/**
 * Wraps a repository so every call is forced to go through tenantId,
 * making it structurally hard to accidentally leak data across tenants.
 */
export abstract class TenantScopedService<T extends TenantScopedEntity> {
  protected constructor(protected readonly repository: Repository<T>) {}

  async findAllForTenant(tenantId: string, where: FindOptionsWhere<T> = {} as FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.find({
      where: { ...where, tenantId } as FindOptionsWhere<T>,
    });
  }

  async findOneForTenant(tenantId: string, id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(`Recurso ${id} no encontrado`);
    }
    return entity;
  }

  async removeForTenant(tenantId: string, id: string): Promise<void> {
    const entity = await this.findOneForTenant(tenantId, id);
    await this.repository.remove(entity);
  }
}
