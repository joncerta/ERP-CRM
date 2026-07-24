import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityInspection } from './entities/quality-inspection.entity';
import { Audit } from './entities/audit.entity';
import { NonConformity } from './entities/non-conformity.entity';
import { CorrectiveAction } from './entities/corrective-action.entity';
import { InspectionsService } from './inspections.service';
import { AuditsService } from './audits.service';
import { NonConformitiesService } from './non-conformities.service';
import { IndicatorsService } from './indicators.service';
import { InspectionsController } from './inspections.controller';
import { AuditsController } from './audits.controller';
import { NonConformitiesController } from './non-conformities.controller';
import { IndicatorsController } from './indicators.controller';
import { ProductionModule } from '../production/production.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { OrgModule } from '../core/org/org.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QualityInspection, Audit, NonConformity, CorrectiveAction]),
    ProductionModule,
    MaintenanceModule,
    OrgModule,
  ],
  providers: [InspectionsService, AuditsService, NonConformitiesService, IndicatorsService],
  controllers: [InspectionsController, AuditsController, NonConformitiesController, IndicatorsController],
  exports: [InspectionsService, AuditsService, NonConformitiesService, IndicatorsService],
})
export class QualityModule {}
