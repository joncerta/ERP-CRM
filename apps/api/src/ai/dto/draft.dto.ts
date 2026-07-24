import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DraftType {
  QUOTE_FOLLOWUP = 'quote_followup',
  TICKET_REPLY = 'ticket_reply',
  PRODUCT_DESCRIPTION = 'product_description',
}

export class DraftDto {
  @IsEnum(DraftType)
  type: DraftType;

  @IsUUID()
  contextId: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
