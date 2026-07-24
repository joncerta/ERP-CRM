import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectResource } from './entities/project-resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class ResourcesService extends TenantScopedService<ProjectResource> {
  constructor(@InjectRepository(ProjectResource) repo: Repository<ProjectResource>) {
    super(repo);
  }

  async assign(tenantId: string, projectId: string, dto: CreateResourceDto): Promise<ProjectResource> {
    const existing = await this.repository.findOne({ where: { tenantId, projectId, userId: dto.userId } });
    if (existing) {
      throw new BadRequestException('Este usuario ya está asignado al proyecto');
    }
    const resource = this.repository.create({
      tenantId,
      projectId,
      userId: dto.userId,
      roleLabel: dto.roleLabel,
      hourlyRate: dto.hourlyRate ?? 0,
    });
    return this.repository.save(resource);
  }

  findForProject(tenantId: string, projectId: string): Promise<ProjectResource[]> {
    return this.repository.find({ where: { tenantId, projectId } });
  }
}
