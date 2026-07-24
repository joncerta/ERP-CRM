import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillOfMaterial } from './entities/bill-of-material.entity';
import { BillOfMaterialLine } from './entities/bill-of-material-line.entity';
import { ProductionOrder } from './entities/production-order.entity';
import { ProductionOrderConsumption } from './entities/production-order-consumption.entity';
import { BomService } from './bom.service';
import { ProductionOrdersService } from './production-orders.service';
import { BomController } from './bom.controller';
import { ProductionOrdersController } from './production-orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { OrgModule } from '../core/org/org.module';

@Module({
  imports: [TypeOrmModule.forFeature([BillOfMaterial, BillOfMaterialLine, ProductionOrder, ProductionOrderConsumption]), InventoryModule, OrgModule],
  providers: [BomService, ProductionOrdersService],
  controllers: [BomController, ProductionOrdersController],
  exports: [BomService, ProductionOrdersService],
})
export class ProductionModule {}
