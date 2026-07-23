import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('finance/suppliers')
@RequireModule('purchasing')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermissions('finance.purchases.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('finance.purchases.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.suppliersService.findPaginated(user.tenantId, query);
    return this.suppliersService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('finance.purchases.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.suppliersService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('finance.purchases.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(user.tenantId, id, dto);
  }
}
