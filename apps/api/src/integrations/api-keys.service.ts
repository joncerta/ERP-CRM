import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

type ApiKeyPublicView = Pick<
  ApiKey,
  'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'name' | 'keyPrefix' | 'scopes' | 'isActive' | 'createdByUserId' | 'lastUsedAt'
>;

@Injectable()
export class ApiKeysService extends TenantScopedService<ApiKey> {
  constructor(@InjectRepository(ApiKey) repo: Repository<ApiKey>) {
    super(repo);
  }

  /** The plaintext key is only ever available in this return value —
   * neither the entity nor any later lookup exposes it again, only the
   * sha256 hash used to authenticate future requests. `save()` echoes
   * back whatever was passed in memory, `select: false` only hides the
   * column on a fresh SELECT, so keyHash has to be stripped by hand here
   * or it would leak straight back out in this one response. */
  async create(tenantId: string, createdByUserId: string, dto: CreateApiKeyDto): Promise<{ apiKey: ApiKeyPublicView; plainKey: string }> {
    const plainKey = `ak_live_${randomBytes(24).toString('hex')}`;
    const apiKey = this.repository.create({
      tenantId,
      name: dto.name,
      scopes: dto.scopes,
      keyPrefix: plainKey.slice(0, 12),
      keyHash: hashKey(plainKey),
      isActive: true,
      createdByUserId,
      lastUsedAt: null,
    });
    const saved = await this.repository.save(apiKey);
    const { keyHash: _keyHash, ...apiKeyWithoutHash } = saved;
    return { apiKey: apiKeyWithoutHash, plainKey };
  }

  async revoke(tenantId: string, id: string): Promise<ApiKey> {
    const apiKey = await this.findOneForTenant(tenantId, id);
    apiKey.isActive = false;
    return this.repository.save(apiKey);
  }

  /** Used only by ApiKeyGuard — looks up by hash across all tenants
   * (the key itself is what determines the tenant, there's no tenantId
   * to scope this query by yet). */
  async findActiveByPlainKey(plainKey: string): Promise<ApiKey | null> {
    return this.repository.findOne({ where: { keyHash: hashKey(plainKey), isActive: true } });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.repository.update({ id }, { lastUsedAt: new Date() });
  }
}
