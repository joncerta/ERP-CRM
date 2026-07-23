import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AccountingModule } from './accounting/accounting.module';
import { FixedAssetsModule } from './fixed-assets/fixed-assets.module';

@Module({
  imports: [InvoicesModule, PurchasesModule, AccountingModule, FixedAssetsModule],
})
export class FinanceModule {}
