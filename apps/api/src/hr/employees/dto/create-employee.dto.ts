import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';
import { ContractType, DocumentType } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsString()
  @MinLength(1)
  documentId: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsNumber()
  @IsPositive()
  baseSalary: number;

  @IsDateString()
  hireDate: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  vacationDaysPerYear?: number;
}
