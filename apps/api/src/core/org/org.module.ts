import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { CostCenter } from './entities/cost-center.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { DocumentSeries } from './entities/document-series.entity';
import { User } from '../users/entities/user.entity';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { CostCentersService } from './cost-centers.service';
import { CostCentersController } from './cost-centers.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { DocumentSeriesService } from './document-series.service';
import { DocumentSeriesController } from './document-series.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, CostCenter, Department, Position, DocumentSeries, User])],
  providers: [BranchesService, CostCentersService, DepartmentsService, PositionsService, DocumentSeriesService],
  controllers: [BranchesController, CostCentersController, DepartmentsController, PositionsController, DocumentSeriesController],
  exports: [BranchesService, CostCentersService, DepartmentsService, PositionsService, DocumentSeriesService],
})
export class OrgModule {}
