import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunitiesService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';
import { PipelineStagesModule } from '../pipeline-stages/pipeline-stages.module';
import { LeadsModule } from '../leads/leads.module';
import { UsersModule } from '../../core/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity]), PipelineStagesModule, LeadsModule, UsersModule],
  providers: [OpportunitiesService],
  controllers: [OpportunitiesController],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
