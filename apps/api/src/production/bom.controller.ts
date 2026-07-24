import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BomService } from './bom.service';
import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('production/boms')
@RequireModule('production')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Post()
  @RequirePermissions('production.bom.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBomDto) {
    return this.bomService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('production.bom.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('productId') productId?: string) {
    return productId ? this.bomService.findForProduct(user.tenantId, productId) : this.bomService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('production.bom.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBomDto) {
    return this.bomService.update(user.tenantId, id, dto);
  }
}
