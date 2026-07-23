import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class EnrollContactsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  contactIds: string[];
}
