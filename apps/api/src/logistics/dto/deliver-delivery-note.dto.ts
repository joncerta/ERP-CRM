import { IsOptional, IsString } from 'class-validator';

export class DeliverDeliveryNoteDto {
  @IsOptional()
  @IsString()
  recipientName?: string;
}
