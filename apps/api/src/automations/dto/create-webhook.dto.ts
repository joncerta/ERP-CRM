import { IsEnum, IsString, IsUrl, MinLength } from 'class-validator';
import { WebhookEventType } from '../entities/webhook-subscription.entity';

export class CreateWebhookDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(WebhookEventType)
  eventType: WebhookEventType;

  @IsUrl({ require_tld: false })
  url: string;
}
