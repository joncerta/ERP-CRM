import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

function buildConfig(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('EmailService', () => {
  it('no-ops without throwing when SMTP_HOST is not configured', async () => {
    const service = new EmailService(buildConfig({}));
    await expect(service.send({ to: 'a@b.com', subject: 'x', html: '<p>x</p>' })).resolves.toBeUndefined();
  });
});
