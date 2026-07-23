import { IsOptional, IsString, IsUUID } from 'class-validator';

export class TransferFixedAssetDto {
  @IsUUID()
  toBranchId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
