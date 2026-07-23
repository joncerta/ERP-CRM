import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AccountingModule } from './accounting/accounting.module';

@Module({
  imports: [InvoicesModule, PurchasesModule, AccountingModule],
})
export class FinanceModule {}
