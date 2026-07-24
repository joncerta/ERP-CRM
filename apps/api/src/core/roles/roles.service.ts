import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { UsersService } from '../users/users.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

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
      'crm.activities.read',
      'crm.activities.write',
      'finance.invoices.read',
      'finance.invoices.write',
      'finance.purchases.read',
      'finance.purchases.write',
      'accounting.entries.read',
      'core.taxes.read',
      'support.tickets.read',
      'support.tickets.write',
      'support.knowledge.read',
      'marketing.campaigns.read',
      'marketing.campaigns.write',
      'marketing.landing_forms.read',
      'marketing.landing_forms.write',
      'marketing.nurture.read',
      'marketing.nurture.write',
      'marketing.segments.read',
      'automation.reports.read',
      'documents.files.read',
      'documents.files.write',
      'documents.communications.read',
      'documents.communications.write',
      'hr.leave_requests.read',
      'hr.leave_requests.write',
    ],
  },
];

/** Reachable only via the seed script directly against the DB — never
 * grantable through a tenant's own role editor. Same boundary the
 * PermissionsGuard enforces for the '*' wildcard, closed here too so a
 * tenant can't just spell the permission out literally instead. */
function assertNoPlatformPermissions(permissions: string[]): void {
  if (permissions.some((p) => p.startsWith('platform.'))) {
    throw new BadRequestException('No se pueden asignar permisos de plataforma a un rol de tenant');
  }
}

@Injectable()
export class RolesService extends TenantScopedService<Role> {
  constructor(
    @InjectRepository(Role) repo: Repository<Role>,
    private readonly usersService: UsersService,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Role>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'role',
      searchColumns: ['name'],
      sortableColumns: ['name', 'createdAt'],
      defaultSortBy: 'name',
    });
  }

  async create(tenantId: string, dto: CreateRoleDto): Promise<Role> {
    assertNoPlatformPermissions(dto.permissions);
    const role = this.repository.create({ ...dto, tenantId, isSystem: false });
    return this.repository.save(role);
  }

  async update(tenantId: string, id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOneForTenant(tenantId, id);
    if (role.isSystem) {
      throw new BadRequestException('Los roles del sistema (Administrador, Vendedor) no se pueden modificar');
    }
    if (dto.permissions) assertNoPlatformPermissions(dto.permissions);
    Object.assign(role, dto);
    return this.repository.save(role);
  }

  async removeRole(tenantId: string, id: string): Promise<void> {
    const role = await this.findOneForTenant(tenantId, id);
    if (role.isSystem) {
      throw new BadRequestException('Los roles del sistema (Administrador, Vendedor) no se pueden eliminar');
    }
    const usersWithRole = await this.usersService.findAllForTenant(tenantId);
    if (usersWithRole.some((u) => u.roleId === id)) {
      throw new BadRequestException('No se puede eliminar un rol que sigue asignado a usuarios');
    }
    await this.repository.remove(role);
  }

  async createDefaultRolesForTenant(tenantId: string): Promise<Role[]> {
    const roles = DEFAULT_ROLE_TEMPLATES.map((template) =>
      this.repository.create({ tenantId, name: template.name, permissions: template.permissions, isSystem: true }),
    );
    return this.repository.save(roles);
  }
}
