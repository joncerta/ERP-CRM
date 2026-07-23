import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { CashAccount } from './entities/cash-account.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { OrgModule } from '../../core/org/org.module';

/** Deliberately a leaf module — it does not import InvoicesModule or
 * PurchasesModule. Those modules import AccountingModule instead (one
 * direction only) to call the postXxx() hooks after issuing/paying, which
 * keeps this module free of any dependency cycle. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Account, JournalEntry, JournalEntryLine, CashAccount, CashTransaction]),
    OrgModule,
  ],
  providers: [AccountingService],
  controllers: [AccountingController],
  exports: [AccountingService],
})
export class AccountingModule {}
