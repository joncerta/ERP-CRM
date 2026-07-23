import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AuditModule } from '../../audit/audit.module';
import { AutomationsModule } from '../../automations/automations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), AuditModule, AutomationsModule],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
