import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ListStockQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
