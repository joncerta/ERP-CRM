import { IsEnum, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { StockMovementType } from '../entities/stock-movement.entity';

export class CreateMovementDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  warehouseId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType.PURCHASE | StockMovementType.SALE | StockMovementType.ADJUSTMENT;

  @IsNumber()
  @IsPositive()
  quantity: number;

  /** Which way `quantity` moves the balance — kept separate from `type` so
   * the form doesn't need four movement types (in/out per purchase and
   * adjustment) just to express direction. */
  @IsIn(['in', 'out'])
  direction: 'in' | 'out';

  @IsOptional()
  @IsString()
  note?: string;
}
