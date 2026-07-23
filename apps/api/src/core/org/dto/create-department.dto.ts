import { IsOptional, IsString, IsUUID } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  costCenterId?: string;
}
