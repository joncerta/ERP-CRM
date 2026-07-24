import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technician } from './entities/technician.entity';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class TechniciansService extends TenantScopedService<Technician> {
  constructor(@InjectRepository(Technician) repo: Repository<Technician>) {
    super(repo);
  }

  create(tenantId: string, dto: CreateTechnicianDto): Promise<Technician> {
    const technician = this.repository.create({
      tenantId,
      name: dto.name,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      specialty: dto.specialty ?? null,
      userId: dto.userId ?? null,
    });
    return this.repository.save(technician);
  }

  async update(tenantId: string, id: string, dto: UpdateTechnicianDto): Promise<Technician> {
    const technician = await this.findOneForTenant(tenantId, id);
    Object.assign(technician, dto);
    return this.repository.save(technician);
  }
}
