import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class VehiclesService extends TenantScopedService<Vehicle> {
  constructor(@InjectRepository(Vehicle) repo: Repository<Vehicle>) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.repository.findOne({ where: { tenantId, plate: dto.plate } });
    if (existing) {
      throw new BadRequestException(`Ya existe un vehículo con la placa "${dto.plate}"`);
    }
    const vehicle = this.repository.create({
      tenantId,
      plate: dto.plate,
      brand: dto.brand,
      model: dto.model,
      capacityKg: dto.capacityKg ?? null,
      notes: dto.notes ?? null,
    });
    return this.repository.save(vehicle);
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOneForTenant(tenantId, id);
    Object.assign(vehicle, dto);
    return this.repository.save(vehicle);
  }
}
