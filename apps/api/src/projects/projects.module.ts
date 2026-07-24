import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectResource } from './entities/project-resource.entity';
import { ProjectTimeEntry } from './entities/project-time-entry.entity';
import { ProjectsService } from './projects.service';
import { MilestonesService } from './milestones.service';
import { ResourcesService } from './resources.service';
import { TimeEntriesService } from './time-entries.service';
import { ProjectsController } from './projects.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMilestone, ProjectResource, ProjectTimeEntry]), NotificationsModule],
  providers: [ProjectsService, MilestonesService, ResourcesService, TimeEntriesService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
