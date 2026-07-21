import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleDefinition } from './entities/module-definition.entity';
import { TenantModule as TenantModuleEntity } from './entities/tenant-module.entity';
import { ModulesCatalogService } from './modules-catalog.service';
import { ModulesCatalogController } from './modules-catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleDefinition, TenantModuleEntity])],
  providers: [ModulesCatalogService],
  controllers: [ModulesCatalogController],
  exports: [ModulesCatalogService],
})
export class ModulesCatalogModule {}
