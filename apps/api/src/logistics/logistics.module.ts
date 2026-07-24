import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Driver } from './entities/driver.entity';
import { DeliveryNote } from './entities/delivery-note.entity';
import { DeliveryNoteItem } from './entities/delivery-note-item.entity';
import { VehiclesService } from './vehicles.service';
import { DriversService } from './drivers.service';
import { DeliveryNotesService } from './delivery-notes.service';
import { VehiclesController } from './vehicles.controller';
import { DriversController } from './drivers.controller';
import { DeliveryNotesController } from './delivery-notes.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { InvoicesModule } from '../finance/invoices/invoices.module';
import { OrgModule } from '../core/org/org.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Driver, DeliveryNote, DeliveryNoteItem]),
    InventoryModule,
    InvoicesModule,
    OrgModule,
  ],
  providers: [VehiclesService, DriversService, DeliveryNotesService],
  controllers: [VehiclesController, DriversController, DeliveryNotesController],
  exports: [VehiclesService, DriversService, DeliveryNotesService],
})
export class LogisticsModule {}
