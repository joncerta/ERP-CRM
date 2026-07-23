import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class DepositDto {
  @IsUUID()
  contraAccountId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class WithdrawDto {
  @IsUUID()
  contraAccountId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class TransferDto {
  @IsUUID()
  toCashAccountId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
