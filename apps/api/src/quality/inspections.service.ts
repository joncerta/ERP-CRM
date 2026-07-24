import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityInspection } from './entities/quality-inspection.entity';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { ProductionOrdersService } from '../production/production-orders.service';
import { EquipmentService } from '../maintenance/equipment.service';

@Injectable()
export class InspectionsService extends TenantScopedService<QualityInspection> {
  constructor(
    @InjectRepository(QualityInspection) repo: Repository<QualityInspection>,
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly equipmentService: EquipmentService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateInspectionDto): Promise<QualityInspection> {
    if (dto.relatedProductionOrderId) {
      await this.productionOrdersService.findOneForTenant(tenantId, dto.relatedProductionOrderId);
    }
    if (dto.relatedEquipmentId) {
      await this.equipmentService.findOneForTenant(tenantId, dto.relatedEquipmentId);
    }
    const inspection = this.repository.create({
      tenantId,
      type: dto.type,
      subject: dto.subject,
      relatedProductionOrderId: dto.relatedProductionOrderId ?? null,
      relatedEquipmentId: dto.relatedEquipmentId ?? null,
      inspectorUserId: dto.inspectorUserId ?? null,
      inspectionDate: dto.inspectionDate,
      result: dto.result,
      notes: dto.notes ?? null,
    });
    return this.repository.save(inspection);
  }

  async update(tenantId: string, id: string, dto: UpdateInspectionDto): Promise<QualityInspection> {
    const inspection = await this.findOneForTenant(tenantId, id);
    if (dto.relatedProductionOrderId) {
      await this.productionOrdersService.findOneForTenant(tenantId, dto.relatedProductionOrderId);
    }
    if (dto.relatedEquipmentId) {
      await this.equipmentService.findOneForTenant(tenantId, dto.relatedEquipmentId);
    }
    Object.assign(inspection, dto);
    return this.repository.save(inspection);
  }
}
