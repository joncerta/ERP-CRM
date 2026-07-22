import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './warehouses/entities/warehouse.entity';
import { Product } from './products/entities/product.entity';
import { StockBalance } from './stock/entities/stock-balance.entity';
import { StockMovement } from './stock/entities/stock-movement.entity';
import { WarehousesService } from './warehouses/warehouses.service';
import { WarehousesController } from './warehouses/warehouses.controller';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { StockService } from './stock/stock.service';
import { StockController } from './stock/stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Product, StockBalance, StockMovement])],
  providers: [WarehousesService, ProductsService, StockService],
  controllers: [WarehousesController, ProductsController, StockController],
  exports: [WarehousesService, ProductsService, StockService],
})
export class InventoryModule {}
