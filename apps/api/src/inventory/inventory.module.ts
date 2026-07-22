import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './warehouses/entities/warehouse.entity';
import { Product } from './products/entities/product.entity';
import { StockBalance } from './stock/entities/stock-balance.entity';
import { StockMovement } from './stock/entities/stock-movement.entity';
import { ProductCategory } from './catalog/entities/product-category.entity';
import { ProductUnit } from './catalog/entities/product-unit.entity';
import { WarehousesService } from './warehouses/warehouses.service';
import { WarehousesController } from './warehouses/warehouses.controller';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { StockService } from './stock/stock.service';
import { StockController } from './stock/stock.controller';
import { ProductCategoriesService } from './catalog/product-categories.service';
import { ProductCategoriesController } from './catalog/product-categories.controller';
import { ProductUnitsService } from './catalog/product-units.service';
import { ProductUnitsController } from './catalog/product-units.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, Product, StockBalance, StockMovement, ProductCategory, ProductUnit]),
  ],
  providers: [WarehousesService, ProductsService, StockService, ProductCategoriesService, ProductUnitsService],
  controllers: [
    WarehousesController,
    ProductsController,
    StockController,
    ProductCategoriesController,
    ProductUnitsController,
  ],
  exports: [WarehousesService, ProductsService, StockService, ProductCategoriesService, ProductUnitsService],
})
export class InventoryModule {}
