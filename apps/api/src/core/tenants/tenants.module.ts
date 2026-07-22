import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantSettingsController } from './tenant-settings.controller';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { ModulesCatalogModule } from '../modules-catalog/modules-catalog.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), RolesModule, UsersModule, ModulesCatalogModule],
  providers: [TenantsService],
  controllers: [TenantsController, TenantSettingsController],
  exports: [TenantsService],
})
export class TenantsModule {}
