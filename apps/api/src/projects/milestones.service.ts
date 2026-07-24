import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMilestone, MilestoneStatus } from './entities/project-milestone.entity';
import { Project } from './entities/project.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { DelayMilestoneDto } from './dto/delay-milestone.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MilestonesService extends TenantScopedService<ProjectMilestone> {
  constructor(
    @InjectRepository(ProjectMilestone) repo: Repository<ProjectMilestone>,
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
    private readonly notificationsService: NotificationsService,
  ) {
    super(repo);
  }

  async create(tenantId: string, projectId: string, dto: CreateMilestoneDto): Promise<ProjectMilestone> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId, tenantId } });
    if (!project) throw new BadRequestException('Proyecto no encontrado');
    const milestone = this.repository.create({ tenantId, projectId, name: dto.name, dueDate: dto.dueDate, status: MilestoneStatus.PENDING });
    return this.repository.save(milestone);
  }

  findForProject(tenantId: string, projectId: string): Promise<ProjectMilestone[]> {
    return this.repository.find({ where: { tenantId, projectId }, order: { dueDate: 'ASC' } });
  }

  async complete(tenantId: string, id: string): Promise<ProjectMilestone> {
    const milestone = await this.findOneForTenant(tenantId, id);
    if (milestone.status === MilestoneStatus.COMPLETED) {
      throw new BadRequestException('Este hito ya está marcado como completado');
    }
    milestone.status = MilestoneStatus.COMPLETED;
    milestone.completedAt = new Date();
    const saved = await this.repository.save(milestone);
    await this.notifyLeader(tenantId, milestone.projectId, 'project.milestone.completed', 'Hito completado', `Se completó el hito "${milestone.name}"`);
    return saved;
  }

  async delay(tenantId: string, id: string, dto: DelayMilestoneDto): Promise<ProjectMilestone> {
    const milestone = await this.findOneForTenant(tenantId, id);
    milestone.status = MilestoneStatus.DELAYED;
    milestone.notes = dto.notes ?? null;
    const saved = await this.repository.save(milestone);
    await this.notifyLeader(
      tenantId,
      milestone.projectId,
      'project.milestone.delayed',
      'Retraso registrado',
      `Se registró un retraso en el hito "${milestone.name}"${dto.notes ? `: ${dto.notes}` : ''}`,
    );
    return saved;
  }

  private async notifyLeader(tenantId: string, projectId: string, type: string, title: string, message: string): Promise<void> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId, tenantId } });
    if (!project) return;
    await this.notificationsService.notify(tenantId, project.leaderUserId, type, title, message, '/projects');
  }
}
