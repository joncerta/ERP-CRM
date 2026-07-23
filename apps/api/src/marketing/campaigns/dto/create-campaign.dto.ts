import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CampaignChannel } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(CampaignChannel)
  channel: CampaignChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(1)
  content: string;
}
