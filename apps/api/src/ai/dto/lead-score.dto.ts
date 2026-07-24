import { IsUUID } from 'class-validator';

export class LeadScoreDto {
  @IsUUID()
  leadId: string;
}
