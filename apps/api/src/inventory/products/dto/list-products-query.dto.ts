import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ListProductsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
