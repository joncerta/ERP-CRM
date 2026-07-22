import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { ModulesCatalogService } from '../modules-catalog/modules-catalog.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly repo: Repository<Tenant>,
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
    private readonly modulesCatalogService: ModulesCatalogService,
  ) {}

  /**
   * Manual onboarding: creates the tenant plus everything needed for its
   * first login in one shot (default roles, admin user, CRM enabled) — no
   * self-service signup yet, so there's no separate "activate later" step.
   */
  async create(dto: CreateTenantDto): Promise<Tenant> {
    const tenant = await this.repo.save(
      this.repo.create({
        name: dto.name,
        slug: dto.slug,
        defaultLocale: dto.defaultLocale,
        defaultCurrencyCode: dto.defaultCurrencyCode,
      }),
    );

    const [adminRole] = await this.rolesService.createDefaultRolesForTenant(tenant.id);
    await this.usersService.create(tenant.id, {
      email: dto.adminEmail,
      password: dto.adminPassword,
      fullName: dto.adminFullName,
      roleId: adminRole.id,
      preferredLocale: tenant.defaultLocale,
    });
    await this.modulesCatalogService.setEnabled(tenant.id, 'crm', true);

    return tenant;
  }

  findAll(): Promise<Tenant[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return tenant;
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async updateSessionIdleTimeout(tenantId: string, minutes: number | null): Promise<Tenant> {
    const tenant = await this.findOne(tenantId);
    tenant.sessionIdleTimeoutMinutes = minutes;
    return this.repo.save(tenant);
  }
}
