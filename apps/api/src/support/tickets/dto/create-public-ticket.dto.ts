import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreatePublicTicketDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsString()
  @MinLength(1)
  reporterName: string;

  @IsEmail()
  reporterEmail: string;
}
