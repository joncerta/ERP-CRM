import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class SendCampaignDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  contactIds: string[];
}
