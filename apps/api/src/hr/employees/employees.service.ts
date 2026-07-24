import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

@Injectable()
export class EmployeesService extends TenantScopedService<Employee> {
  constructor(@InjectRepository(Employee) repo: Repository<Employee>) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.repository.findOne({ where: { tenantId, userId: dto.userId } });
    if (existing) {
      throw new BadRequestException('Este usuario ya tiene un expediente de empleado');
    }
    const employee = this.repository.create({ tenantId, ...dto });
    return this.repository.save(employee);
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOneForTenant(tenantId, id);
    Object.assign(employee, dto);
    return this.repository.save(employee);
  }

  findActiveForTenant(tenantId: string): Promise<Employee[]> {
    return this.repository.find({ where: { tenantId } });
  }
}
