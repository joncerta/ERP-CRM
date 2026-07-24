import { IsNumber, IsPositive } from 'class-validator';

export class CompleteProductionOrderDto {
  @IsNumber()
  @IsPositive()
  quantityProduced: number;
}
