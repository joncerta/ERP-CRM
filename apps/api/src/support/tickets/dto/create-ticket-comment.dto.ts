import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketCommentDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
