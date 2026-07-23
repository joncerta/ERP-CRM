import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';
import { TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  companyId?: string;
}
