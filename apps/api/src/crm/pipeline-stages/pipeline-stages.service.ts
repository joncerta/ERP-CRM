import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_PIPELINE_STAGES, PipelineStage } from './entities/pipeline-stage.entity';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

@Injectable()
export class PipelineStagesService extends TenantScopedService<PipelineStage> {
  constructor(@InjectRepository(PipelineStage) repo: Repository<PipelineStage>) {
    super(repo);
  }

  async findAllOrdered(tenantId: string): Promise<PipelineStage[]> {
    const stages = await this.repository.find({ where: { tenantId }, order: { order: 'ASC' } });
    if (stages.length > 0) return stages;
    // First call for this tenant: seed the default pipeline lazily.
    return this.createDefaultStagesForTenant(tenantId);
  }

  async createDefaultStagesForTenant(tenantId: string): Promise<PipelineStage[]> {
    const stages = DEFAULT_PIPELINE_STAGES.map((stage) => this.repository.create({ ...stage, tenantId }));
    return this.repository.save(stages);
  }
}
