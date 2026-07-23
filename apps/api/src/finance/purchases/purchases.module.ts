import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { SupplierInvoicesService } from './supplier-invoices.service';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { OrgModule } from '../../core/org/org.module';
import { UsersModule } from '../../core/users/users.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, PurchaseOrder, PurchaseOrderItem, SupplierInvoice, SupplierPayment]),
    OrgModule,
    UsersModule,
    InventoryModule,
    AccountingModule,
  ],
  providers: [SuppliersService, PurchaseOrdersService, SupplierInvoicesService],
  controllers: [SuppliersController, PurchaseOrdersController, SupplierInvoicesController],
  exports: [SuppliersService, PurchaseOrdersService, SupplierInvoicesService],
})
export class PurchasesModule {}
