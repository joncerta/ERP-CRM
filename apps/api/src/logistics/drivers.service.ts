import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class DriversService extends TenantScopedService<Driver> {
  constructor(@InjectRepository(Driver) repo: Repository<Driver>) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateDriverDto): Promise<Driver> {
    const driver = this.repository.create({
      tenantId,
      name: dto.name,
      licenseNumber: dto.licenseNumber ?? null,
      phone: dto.phone ?? null,
      userId: dto.userId ?? null,
    });
    return this.repository.save(driver);
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOneForTenant(tenantId, id);
    Object.assign(driver, dto);
    return this.repository.save(driver);
  }
}
