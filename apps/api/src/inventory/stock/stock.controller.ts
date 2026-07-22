import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('inventory/stock')
@RequireModule('inventory')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('balances')
  @RequirePermissions('inventory.stock.read')
  findBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.stockService.findBalances(user.tenantId, { productId, warehouseId });
  }

  @Get('movements')
  @RequirePermissions('inventory.stock.read')
  findMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.stockService.findMovements(user.tenantId, { productId, warehouseId });
  }

  @Post('movements')
  @RequirePermissions('inventory.stock.write')
  recordMovement(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMovementDto) {
    return this.stockService.recordMovement(user.tenantId, user.userId, dto);
  }

  @Post('transfers')
  @RequirePermissions('inventory.stock.write')
  transfer(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransferDto) {
    return this.stockService.transfer(user.tenantId, user.userId, dto);
  }
}
