import { IsBoolean } from 'class-validator';

export class RespondQuoteDto {
  @IsBoolean()
  accepted: boolean;
}
