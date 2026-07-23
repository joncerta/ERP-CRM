import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { WebhookSubscription, WebhookEventType } from './entities/webhook-subscription.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class WebhooksService extends TenantScopedService<WebhookSubscription> {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(@InjectRepository(WebhookSubscription) repo: Repository<WebhookSubscription>) {
    super(repo);
  }

  create(tenantId: string, dto: CreateWebhookDto): Promise<WebhookSubscription> {
    const webhook = this.repository.create({
      tenantId,
      name: dto.name,
      eventType: dto.eventType,
      url: dto.url,
      secret: randomBytes(24).toString('hex'),
      isActive: true,
      lastTriggeredAt: null,
      lastStatus: null,
    });
    return this.repository.save(webhook);
  }

  async update(tenantId: string, id: string, dto: UpdateWebhookDto): Promise<WebhookSubscription> {
    const webhook = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) webhook.name = dto.name;
    if (dto.url !== undefined) webhook.url = dto.url;
    if (dto.isActive !== undefined) webhook.isActive = dto.isActive;
    return this.repository.save(webhook);
  }

  /** Fires a real HTTP POST to every active subscription for this event —
   * no gateway/credentials needed for a plain webhook, unlike SMS/WhatsApp
   * in Marketing, so this isn't simulated. Best-effort: a subscriber's
   * endpoint being down never breaks the caller (lead creation, quote
   * response, etc.) — the failure is only recorded on the subscription
   * itself via lastStatus. */
  async dispatch(tenantId: string, eventType: WebhookEventType, payload: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.repository.find({ where: { tenantId, eventType, isActive: true } });
    for (const sub of subscriptions) {
      const body = JSON.stringify({ event: eventType, data: payload, sentAt: new Date().toISOString() });
      const signature = createHmac('sha256', sub.secret).update(body).digest('hex');
      try {
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
          body,
        });
        sub.lastStatus = res.ok ? `ok (${res.status})` : `error (${res.status})`;
      } catch (err) {
        sub.lastStatus = `error: ${(err as Error).message}`;
        this.logger.warn(`Webhook "${sub.name}" (${sub.url}) falló: ${sub.lastStatus}`);
      }
      sub.lastTriggeredAt = new Date();
      await this.repository.save(sub);
    }
  }
}
