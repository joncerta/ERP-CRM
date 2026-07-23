import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRule, AutomationRuleType } from './entities/automation-rule.entity';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { User } from '../core/users/entities/user.entity';
import { Lead } from '../crm/leads/entities/lead.entity';

@Injectable()
export class AutomationRulesService extends TenantScopedService<AutomationRule> {
  constructor(
    @InjectRepository(AutomationRule) repo: Repository<AutomationRule>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
  ) {
    super(repo);
  }

  create(tenantId: string, dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    const rule = this.repository.create({ tenantId, name: dto.name, type: dto.type, config: dto.config ?? {}, isActive: true });
    return this.repository.save(rule);
  }

  async update(tenantId: string, id: string, dto: UpdateAutomationRuleDto): Promise<AutomationRule> {
    const rule = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.config !== undefined) rule.config = dto.config;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    return this.repository.save(rule);
  }

  findActiveByType(tenantId: string, type: AutomationRuleType): Promise<AutomationRule[]> {
    return this.repository.find({ where: { tenantId, type, isActive: true } });
  }

  /** Load-balanced round robin: assigns to whichever active user currently
   * owns the fewest leads, rather than tracking a rotation pointer in its
   * own state row — self-correcting if someone is on leave and stops
   * getting new ones manually reassigned to them. */
  async pickNextOwner(tenantId: string): Promise<string | null> {
    const users = await this.usersRepo.find({ where: { tenantId, isActive: true }, order: { createdAt: 'ASC' } });
    if (!users.length) return null;

    const counts = await this.leadsRepo
      .createQueryBuilder('lead')
      .select('lead.ownerUserId', 'ownerUserId')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.ownerUserId IS NOT NULL')
      .groupBy('lead.ownerUserId')
      .getRawMany<{ ownerUserId: string; count: string }>();
    const countByUser = new Map(counts.map((c) => [c.ownerUserId, Number(c.count)]));

    let best = users[0];
    let bestCount = countByUser.get(best.id) ?? 0;
    for (const user of users.slice(1)) {
      const count = countByUser.get(user.id) ?? 0;
      if (count < bestCount) {
        best = user;
        bestCount = count;
      }
    }
    return best.id;
  }
}
