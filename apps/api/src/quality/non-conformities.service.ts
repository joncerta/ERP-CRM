import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NonConformity, NonConformityStatus } from './entities/non-conformity.entity';
import { CorrectiveAction, ActionStatus } from './entities/corrective-action.entity';
import { QualityInspection } from './entities/quality-inspection.entity';
import { Audit } from './entities/audit.entity';
import { CreateNonConformityDto } from './dto/create-non-conformity.dto';
import { UpdateNonConformityDto } from './dto/update-non-conformity.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { DocumentSeriesService } from '../core/org/document-series.service';

@Injectable()
export class NonConformitiesService extends TenantScopedService<NonConformity> {
  constructor(
    @InjectRepository(NonConformity) repo: Repository<NonConformity>,
    @InjectRepository(QualityInspection) private readonly inspectionsRepo: Repository<QualityInspection>,
    @InjectRepository(Audit) private readonly auditsRepo: Repository<Audit>,
    private readonly documentSeriesService: DocumentSeriesService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateNonConformityDto): Promise<NonConformity> {
    if (dto.inspectionId) {
      const inspection = await this.inspectionsRepo.findOne({ where: { id: dto.inspectionId, tenantId } });
      if (!inspection) throw new BadRequestException('Inspección no encontrada');
    }
    if (dto.auditId) {
      const audit = await this.auditsRepo.findOne({ where: { id: dto.auditId, tenantId } });
      if (!audit) throw new BadRequestException('Auditoría no encontrada');
    }

    const ncNumber = await this.documentSeriesService.consumeNext(tenantId, 'quality_non_conformity');
    const nonConformity = this.repository.create({
      tenantId,
      ncNumber,
      description: dto.description,
      severity: dto.severity,
      status: NonConformityStatus.OPEN,
      detectedDate: dto.detectedDate,
      inspectionId: dto.inspectionId ?? null,
      auditId: dto.auditId ?? null,
      actions: (dto.actions ?? []).map((a) => Object.assign(new CorrectiveAction(), a)),
    });
    return this.repository.save(nonConformity);
  }

  async update(tenantId: string, id: string, dto: UpdateNonConformityDto): Promise<NonConformity> {
    const nonConformity = await this.findOneForTenant(tenantId, id);
    if (nonConformity.status === NonConformityStatus.CLOSED) {
      throw new BadRequestException('Esta no conformidad ya está cerrada y no se puede editar');
    }
    if (dto.description !== undefined) nonConformity.description = dto.description;
    if (dto.severity !== undefined) nonConformity.severity = dto.severity;
    if (dto.actions) {
      nonConformity.actions = dto.actions.map((a) => Object.assign(new CorrectiveAction(), a));
    }
    return this.repository.save(nonConformity);
  }

  /** Requires every corrective action to be completed first — closing a
   * non-conformity with unfinished actions would just hide the problem. */
  async close(tenantId: string, id: string): Promise<NonConformity> {
    const nonConformity = await this.findOneForTenant(tenantId, id);
    if (nonConformity.status === NonConformityStatus.CLOSED) {
      throw new BadRequestException('Esta no conformidad ya está cerrada');
    }
    const pendingActions = nonConformity.actions.filter((a) => a.status !== ActionStatus.COMPLETED);
    if (pendingActions.length > 0) {
      throw new BadRequestException('No se puede cerrar: hay acciones correctivas sin completar');
    }
    nonConformity.status = NonConformityStatus.CLOSED;
    nonConformity.closedDate = new Date().toISOString().slice(0, 10);
    return this.repository.save(nonConformity);
  }

  async updateAction(tenantId: string, id: string, actionId: string, dto: UpdateActionDto): Promise<NonConformity> {
    const nonConformity = await this.findOneForTenant(tenantId, id);
    const action = nonConformity.actions.find((a) => a.id === actionId);
    if (!action) {
      throw new NotFoundException(`Acción correctiva ${actionId} no encontrada`);
    }
    if (dto.status !== undefined) {
      action.status = dto.status;
      action.completedDate = dto.status === ActionStatus.COMPLETED ? new Date().toISOString().slice(0, 10) : null;
    }
    if (dto.completionNotes !== undefined) action.completionNotes = dto.completionNotes ?? null;
    if (nonConformity.status === NonConformityStatus.OPEN) {
      nonConformity.status = NonConformityStatus.IN_PROGRESS;
    }
    return this.repository.save(nonConformity);
  }
}
