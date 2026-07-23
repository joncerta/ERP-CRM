import { IsOptional, IsString, IsUUID } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreatePositionDto {
  @IsString()
  name: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  departmentId?: string;
}
