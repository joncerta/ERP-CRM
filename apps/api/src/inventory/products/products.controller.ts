import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('inventory/products')
@RequireModule('inventory')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('inventory.products.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('inventory.products.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListProductsQueryDto) {
    if (query.page) return this.productsService.findPaginated(user.tenantId, query);
    return this.productsService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('inventory.products.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.products.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.remove(user.tenantId, id);
  }
}
