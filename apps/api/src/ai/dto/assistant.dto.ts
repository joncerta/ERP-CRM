import { IsString, MinLength } from 'class-validator';

export class AssistantDto {
  @IsString()
  @MinLength(3)
  question: string;
}
