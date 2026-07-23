import { Repository } from 'typeorm';
import { WebhooksService } from './webhooks.service';
import { WebhookEventType, WebhookSubscription } from './entities/webhook-subscription.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'webhook-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<WebhookSubscription>>;
  return { repo };
}

function buildService() {
  const deps = buildDeps();
  const service = new WebhooksService(deps.repo);
  return { service, ...deps };
}

describe('WebhooksService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('dispatch', () => {
    it('POSTs a signed payload to every active subscription for the event and records success', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([
        { id: 'sub-1', tenantId: 'tenant-a', url: 'https://example.com/hook', secret: 'abc123', eventType: WebhookEventType.LEAD_CREATED } as WebhookSubscription,
      ]);
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await service.dispatch('tenant-a', WebhookEventType.LEAD_CREATED, { leadId: 'lead-1' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-Webhook-Signature': expect.any(String) }),
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ lastStatus: 'ok (200)' }));
    });

    it('records the failure instead of throwing when the subscriber endpoint is unreachable', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([
        { id: 'sub-1', tenantId: 'tenant-a', url: 'https://down.example.com', secret: 'abc123', eventType: WebhookEventType.QUOTE_ACCEPTED } as WebhookSubscription,
      ]);
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.dispatch('tenant-a', WebhookEventType.QUOTE_ACCEPTED, {})).resolves.toBeUndefined();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ lastStatus: 'error: ECONNREFUSED' }));
    });

    it('does nothing when there are no active subscriptions for the event', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([]);
      global.fetch = jest.fn();

      await service.dispatch('tenant-a', WebhookEventType.OPPORTUNITY_WON, {});

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
