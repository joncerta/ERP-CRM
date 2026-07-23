import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CashAccountType } from '../entities/cash-account.entity';

export class CreateCashAccountDto {
  @IsString()
  name: string;

  @IsEnum(CashAccountType)
  type: CashAccountType;

  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;
}
