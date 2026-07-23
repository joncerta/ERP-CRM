import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { PurchasesModule } from './purchases/purchases.module';

@Module({
  imports: [InvoicesModule, PurchasesModule],
})
export class FinanceModule {}
