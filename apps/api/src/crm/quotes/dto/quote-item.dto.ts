import { IsNumber, IsString, Min } from 'class-validator';

export class QuoteItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
