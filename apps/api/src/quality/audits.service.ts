import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit, AuditStatus } from './entities/audit.entity';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateAuditDto } from './dto/update-audit.dto';
import { CompleteAuditDto } from './dto/complete-audit.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class AuditsService extends TenantScopedService<Audit> {
  constructor(@InjectRepository(Audit) repo: Repository<Audit>) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateAuditDto): Promise<Audit> {
    const audit = this.repository.create({
      tenantId,
      type: dto.type,
      scope: dto.scope,
      auditor: dto.auditor,
      scheduledDate: dto.scheduledDate,
      status: AuditStatus.PLANNED,
    });
    return this.repository.save(audit);
  }

  async update(tenantId: string, id: string, dto: UpdateAuditDto): Promise<Audit> {
    const audit = await this.findOneForTenant(tenantId, id);
    if (audit.status !== AuditStatus.PLANNED) {
      throw new BadRequestException('Solo se puede editar una auditoría planeada');
    }
    Object.assign(audit, dto);
    return this.repository.save(audit);
  }

  async complete(tenantId: string, id: string, dto: CompleteAuditDto): Promise<Audit> {
    const audit = await this.findOneForTenant(tenantId, id);
    if (audit.status !== AuditStatus.PLANNED) {
      throw new BadRequestException('Solo se pueden completar auditorías planeadas');
    }
    audit.status = AuditStatus.COMPLETED;
    audit.completedDate = new Date().toISOString().slice(0, 10);
    audit.findings = dto.findings;
    return this.repository.save(audit);
  }

  async cancel(tenantId: string, id: string): Promise<Audit> {
    const audit = await this.findOneForTenant(tenantId, id);
    if (audit.status !== AuditStatus.PLANNED) {
      throw new BadRequestException('Solo se pueden cancelar auditorías planeadas');
    }
    audit.status = AuditStatus.CANCELLED;
    return this.repository.save(audit);
  }
}
