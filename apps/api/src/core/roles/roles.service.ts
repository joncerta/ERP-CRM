import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

export const DEFAULT_ROLE_TEMPLATES: Array<{ name: string; permissions: string[] }> = [
  {
    name: 'Administrador',
    permissions: ['*'],
  },
  {
    name: 'Vendedor',
    permissions: [
      'crm.contacts.read',
      'crm.contacts.write',
      'crm.leads.read',
      'crm.leads.write',
      'crm.opportunities.read',
      'crm.opportunities.write',
      'crm.quotes.read',
      'crm.quotes.write',
    ],
  },
];

@Injectable()
export class RolesService extends TenantScopedService<Role> {
  constructor(@InjectRepository(Role) repo: Repository<Role>) {
    super(repo);
  }

  create(tenantId: string, dto: CreateRoleDto): Promise<Role> {
    const role = this.repository.create({ ...dto, tenantId });
    return this.repository.save(role);
  }

  async createDefaultRolesForTenant(tenantId: string): Promise<Role[]> {
    const roles = DEFAULT_ROLE_TEMPLATES.map((template) =>
      this.repository.create({ tenantId, name: template.name, permissions: template.permissions, isSystem: true }),
    );
    return this.repository.save(roles);
  }
}
