import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RespondQuoteDto {
  @IsBoolean()
  accepted: boolean;

  /** Required by the service (not here) when accepted=true — the "simple
   * electronic signature": the customer's typed full name. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  signedByName?: string;
}
