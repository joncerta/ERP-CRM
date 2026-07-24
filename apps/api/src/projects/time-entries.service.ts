import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTimeEntry } from './entities/project-time-entry.entity';
import { ProjectResource } from './entities/project-resource.entity';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Injectable()
export class TimeEntriesService extends TenantScopedService<ProjectTimeEntry> {
  constructor(
    @InjectRepository(ProjectTimeEntry) repo: Repository<ProjectTimeEntry>,
    @InjectRepository(ProjectResource) private readonly resourcesRepo: Repository<ProjectResource>,
  ) {
    super(repo);
  }

  async create(tenantId: string, actingUser: AuthenticatedUser, projectId: string, dto: CreateTimeEntryDto): Promise<ProjectTimeEntry> {
    const resource = await this.resourcesRepo.findOne({ where: { id: dto.resourceId, tenantId, projectId } });
    if (!resource) throw new BadRequestException('Recurso no encontrado en este proyecto');

    // Anyone with the write permission can log their own hours; only a
    // full admin can log time on someone else's behalf.
    if (resource.userId !== actingUser.userId && !actingUser.permissions.includes('*')) {
      throw new ForbiddenException('Solo puedes registrar horas para ti mismo');
    }

    const cost = Math.round(dto.hours * Number(resource.hourlyRate) * 100) / 100;
    const entry = this.repository.create({
      tenantId,
      projectId,
      resourceId: dto.resourceId,
      date: dto.date,
      hours: dto.hours,
      description: dto.description ?? null,
      cost,
    });
    return this.repository.save(entry);
  }

  findForProject(tenantId: string, projectId: string): Promise<ProjectTimeEntry[]> {
    return this.repository.find({ where: { tenantId, projectId }, order: { date: 'DESC' } });
  }
}
