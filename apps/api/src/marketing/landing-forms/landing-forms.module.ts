import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingForm } from './entities/landing-form.entity';
import { LandingFormsService } from './landing-forms.service';
import { LandingFormsController } from './landing-forms.controller';
import { LandingFormsPublicController } from './landing-forms-public.controller';
import { LeadsModule } from '../../crm/leads/leads.module';
import { TenantsModule } from '../../core/tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([LandingForm]), LeadsModule, TenantsModule],
  providers: [LandingFormsService],
  controllers: [LandingFormsController, LandingFormsPublicController],
  exports: [LandingFormsService],
})
export class LandingFormsModule {}
