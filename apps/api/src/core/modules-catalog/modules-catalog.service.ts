import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleDefinition } from './entities/module-definition.entity';
import { TenantModule } from './entities/tenant-module.entity';

@Injectable()
export class ModulesCatalogService {
  constructor(
    @InjectRepository(ModuleDefinition) private readonly definitionsRepo: Repository<ModuleDefinition>,
    @InjectRepository(TenantModule) private readonly tenantModulesRepo: Repository<TenantModule>,
  ) {}

  findAllDefinitions(): Promise<ModuleDefinition[]> {
    return this.definitionsRepo.find();
  }

  findEnabledForTenant(tenantId: string): Promise<TenantModule[]> {
    return this.tenantModulesRepo.find({ where: { tenantId, isEnabled: true } });
  }

  /** Full catalog with this tenant's on/off state — used by the platform admin panel. */
  async findStatusForTenant(
    tenantId: string,
  ): Promise<Array<{ code: string; name: string; description: string | null; isCore: boolean; isEnabled: boolean }>> {
    const [definitions, tenantModules] = await Promise.all([
      this.definitionsRepo.find(),
      this.tenantModulesRepo.find({ where: { tenantId } }),
    ]);
    return definitions.map((def) => ({
      code: def.code,
      name: def.name,
      description: def.description,
      isCore: def.isCore,
      isEnabled: def.isCore || (tenantModules.find((tm) => tm.moduleCode === def.code)?.isEnabled ?? false),
    }));
  }

  async isEnabledForTenant(tenantId: string, moduleCode: string): Promise<boolean> {
    const definition = await this.definitionsRepo.findOne({ where: { code: moduleCode } });
    if (definition?.isCore) return true;

    const tenantModule = await this.tenantModulesRepo.findOne({ where: { tenantId, moduleCode } });
    return tenantModule?.isEnabled ?? false;
  }

  async setEnabled(tenantId: string, moduleCode: string, isEnabled: boolean): Promise<TenantModule> {
    const definition = await this.definitionsRepo.findOne({ where: { code: moduleCode } });
    if (!definition) {
      throw new NotFoundException(`Módulo ${moduleCode} no existe en el catálogo`);
    }

    let tenantModule = await this.tenantModulesRepo.findOne({ where: { tenantId, moduleCode } });
    if (!tenantModule) {
      tenantModule = this.tenantModulesRepo.create({ tenantId, moduleCode });
    }
    tenantModule.isEnabled = isEnabled;
    tenantModule.enabledAt = isEnabled ? new Date() : null;
    return this.tenantModulesRepo.save(tenantModule);
  }
}
