import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from './entities/equipment.entity';
import { Technician } from './entities/technician.entity';
import { MaintenanceWorkOrder } from './entities/maintenance-work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { EquipmentService } from './equipment.service';
import { TechniciansService } from './technicians.service';
import { WorkOrdersService } from './work-orders.service';
import { EquipmentController } from './equipment.controller';
import { TechniciansController } from './technicians.controller';
import { WorkOrdersController } from './work-orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { OrgModule } from '../core/org/org.module';

@Module({
  imports: [TypeOrmModule.forFeature([Equipment, Technician, MaintenanceWorkOrder, WorkOrderPart]), InventoryModule, OrgModule],
  providers: [EquipmentService, TechniciansService, WorkOrdersService],
  controllers: [EquipmentController, TechniciansController, WorkOrdersController],
  exports: [EquipmentService, TechniciansService, WorkOrdersService],
})
export class MaintenanceModule {}
