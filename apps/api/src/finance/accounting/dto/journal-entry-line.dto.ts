import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class JournalEntryLineDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @Min(0)
  debit: number;

  @IsNumber()
  @Min(0)
  credit: number;

  @IsOptional()
  @IsString()
  description?: string;
}
