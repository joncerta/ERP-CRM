import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsString, ValidateNested } from 'class-validator';
import { JournalEntryLineDto } from './journal-entry-line.dto';

export class CreateJournalEntryDto {
  @IsDateString()
  date: string;

  @IsString()
  description: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}
