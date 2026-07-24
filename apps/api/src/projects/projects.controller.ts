import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { MilestonesService } from './milestones.service';
import { ResourcesService } from './resources.service';
import { TimeEntriesService } from './time-entries.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { DelayMilestoneDto } from './dto/delay-milestone.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller()
@RequireModule('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly milestonesService: MilestonesService,
    private readonly resourcesService: ResourcesService,
    private readonly timeEntriesService: TimeEntriesService,
  ) {}

  // --- Proyectos ---
  @Post('projects')
  @RequirePermissions('projects.projects.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.tenantId, dto);
  }

  @Get('projects')
  @RequirePermissions('projects.projects.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findAllForTenant(user.tenantId);
  }

  @Patch('projects/:id')
  @RequirePermissions('projects.projects.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(user.tenantId, id, dto);
  }

  @Get('projects/:id/summary')
  @RequirePermissions('projects.projects.read')
  summary(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.getSummary(user.tenantId, id);
  }

  // --- Hitos ---
  @Post('projects/:id/milestones')
  @RequirePermissions('projects.projects.write')
  createMilestone(@CurrentUser() user: AuthenticatedUser, @Param('id') projectId: string, @Body() dto: CreateMilestoneDto) {
    return this.milestonesService.create(user.tenantId, projectId, dto);
  }

  @Get('projects/:id/milestones')
  @RequirePermissions('projects.projects.read')
  findMilestones(@CurrentUser() user: AuthenticatedUser, @Param('id') projectId: string) {
    return this.milestonesService.findForProject(user.tenantId, projectId);
  }

  @Patch('milestones/:id/complete')
  @RequirePermissions('projects.projects.write')
  completeMilestone(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.milestonesService.complete(user.tenantId, id);
  }

  @Patch('milestones/:id/delay')
  @RequirePermissions('projects.projects.write')
  delayMilestone(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DelayMilestoneDto) {
    return this.milestonesService.delay(user.tenantId, id, dto);
  }

  // --- Recursos asignados ---
  @Post('projects/:id/resources')
  @RequirePermissions('projects.projects.write')
  assignResource(@CurrentUser() user: AuthenticatedUser, @Param('id') projectId: string, @Body() dto: CreateResourceDto) {
    return this.resourcesService.assign(user.tenantId, projectId, dto);
  }

  @Get('projects/:id/resources')
  @RequirePermissions('projects.projects.read')
  findResources(@CurrentUser() user: AuthenticatedUser, @Param('id') projectId: string) {
    return this.resourcesService.findForProject(user.tenantId, projectId);
  }

  // --- Registro de horas ---
  @Post('projects/:id/time-entries')
  @RequirePermissions('projects.time_entries.write')
  logTime(@CurrentUser() user: AuthenticatedUser, @Param('id') projectId: string, @Body() dto: CreateTimeEntryDto) {
    return this.timeEntriesService.create(user.tenantId, user, projectId, dto);
  }

  @Get('projects/:id/time-entries')
  @RequirePermissions('projects.time_entries.read')
  findTimeEntries(@CurrentUser() user: AuthenticatedUser, @Param('id') projectId: string) {
    return this.timeEntriesService.findForProject(user.tenantId, projectId);
  }
}
