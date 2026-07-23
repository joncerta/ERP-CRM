import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoiceAdjustment } from './entities/invoice-adjustment.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { RecurringInvoiceTemplate } from './entities/recurring-invoice-template.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { OrgModule } from '../../core/org/org.module';
import { UsersModule } from '../../core/users/users.module';
import { QuotesModule } from '../../crm/quotes/quotes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, InvoiceAdjustment, InvoicePayment, RecurringInvoiceTemplate]),
    OrgModule,
    UsersModule,
    QuotesModule,
  ],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
