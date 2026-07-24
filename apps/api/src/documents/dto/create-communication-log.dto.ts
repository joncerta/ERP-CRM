import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CommunicationChannel, CommunicationDirection } from '../entities/communication-log-entry.entity';

export class CreateCommunicationLogDto {
  @IsUUID()
  contactId: string;

  @IsEnum(CommunicationChannel)
  channel: CommunicationChannel;

  @IsEnum(CommunicationDirection)
  direction: CommunicationDirection;

  @IsString()
  @MinLength(1)
  summary: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
