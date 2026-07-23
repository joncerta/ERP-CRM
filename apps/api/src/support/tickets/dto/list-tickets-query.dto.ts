import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { TicketStatus, TicketPriority } from '../entities/ticket.entity';

export class ListTicketsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
