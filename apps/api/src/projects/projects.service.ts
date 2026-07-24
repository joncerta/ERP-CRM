import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectMilestone, MilestoneStatus } from './entities/project-milestone.entity';
import { ProjectTimeEntry } from './entities/project-time-entry.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

export interface ProjectSummary {
  totalMilestones: number;
  completedMilestones: number;
  delayedMilestones: number;
  progressPercent: number;
  totalCost: number;
  budget: number;
  profitability: number;
  marginPercent: number | null;
}

@Injectable()
export class ProjectsService extends TenantScopedService<Project> {
  constructor(
    @InjectRepository(Project) repo: Repository<Project>,
    @InjectRepository(ProjectMilestone) private readonly milestonesRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectTimeEntry) private readonly timeEntriesRepo: Repository<ProjectTimeEntry>,
  ) {
    super(repo);
  }

  create(tenantId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.repository.create({
      tenantId,
      name: dto.name,
      companyId: dto.companyId ?? null,
      leaderUserId: dto.leaderUserId,
      description: dto.description ?? null,
      status: ProjectStatus.PLANNING,
      budget: dto.budget ?? 0,
      currencyCode: dto.currencyCode ?? 'USD',
      startDate: dto.startDate,
      plannedEndDate: dto.plannedEndDate ?? null,
    });
    return this.repository.save(project);
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOneForTenant(tenantId, id);
    Object.assign(project, dto);
    return this.repository.save(project);
  }

  /** Progress = share of milestones completed; profitability = budget
   * minus the accumulated cost of logged time — no revenue/invoice
   * linkage, so this is "cost against budget", not full P&L. */
  async getSummary(tenantId: string, projectId: string): Promise<ProjectSummary> {
    const project = await this.findOneForTenant(tenantId, projectId);
    const milestones = await this.milestonesRepo.find({ where: { tenantId, projectId } });
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
    const delayedMilestones = milestones.filter((m) => m.status === MilestoneStatus.DELAYED).length;
    const progressPercent = totalMilestones ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const timeEntries = await this.timeEntriesRepo.find({ where: { tenantId, projectId } });
    const totalCost = Math.round(timeEntries.reduce((sum, e) => sum + Number(e.cost), 0) * 100) / 100;

    const budget = Number(project.budget);
    const profitability = Math.round((budget - totalCost) * 100) / 100;
    const marginPercent = budget > 0 ? Math.round((profitability / budget) * 10000) / 100 : null;

    return { totalMilestones, completedMilestones, delayedMilestones, progressPercent, totalCost, budget, profitability, marginPercent };
  }
}
