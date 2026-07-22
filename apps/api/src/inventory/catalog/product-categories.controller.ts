import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('inventory/categories')
@RequireModule('inventory')
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Post()
  @RequirePermissions('inventory.products.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('inventory.products.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('inventory.products.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.products.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.tenantId, id);
  }
}
