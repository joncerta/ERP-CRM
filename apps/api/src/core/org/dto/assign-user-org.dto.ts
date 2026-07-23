import { IsOptional, IsUUID } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

/** Assigns a user's place in the org structure — manager, branch,
 * department and position are independent and any subset may be sent. */
export class AssignUserOrgDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  managerId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  positionId?: string;
}
