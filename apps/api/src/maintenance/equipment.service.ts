import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from './entities/equipment.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class EquipmentService extends TenantScopedService<Equipment> {
  constructor(@InjectRepository(Equipment) repo: Repository<Equipment>) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateEquipmentDto): Promise<Equipment> {
    const existing = await this.repository.findOne({ where: { tenantId, code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Ya existe un equipo con el código "${dto.code}"`);
    }
    const equipment = this.repository.create({
      tenantId,
      name: dto.name,
      code: dto.code,
      category: dto.category,
      location: dto.location ?? null,
      acquisitionDate: dto.acquisitionDate ?? null,
      notes: dto.notes ?? null,
    });
    return this.repository.save(equipment);
  }

  async update(tenantId: string, id: string, dto: UpdateEquipmentDto): Promise<Equipment> {
    const equipment = await this.findOneForTenant(tenantId, id);
    Object.assign(equipment, dto);
    return this.repository.save(equipment);
  }
}
