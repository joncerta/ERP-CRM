import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { ListJournalEntriesQueryDto } from './dto/list-journal-entries-query.dto';
import { CreateCashAccountDto } from './dto/create-cash-account.dto';
import { UpdateCashAccountDto } from './dto/update-cash-account.dto';
import { DepositDto, WithdrawDto, TransferDto } from './dto/cash-movement.dto';
import { IncomeStatementQueryDto } from './dto/income-statement-query.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('accounting')
@RequireModule('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @RequirePermissions('accounting.entries.read')
  findAccounts(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.accountingService.findPaginated(user.tenantId, query);
    return this.accountingService.findAllForTenant(user.tenantId);
  }

  @Post('accounts')
  @RequirePermissions('accounting.entries.write')
  createAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAccountDto) {
    return this.accountingService.create(user.tenantId, dto);
  }

  @Patch('accounts/:id')
  @RequirePermissions('accounting.entries.write')
  updateAccount(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountingService.update(user.tenantId, id, dto);
  }

  @Post('accounts/seed-defaults')
  @RequirePermissions('accounting.entries.write')
  seedDefaults(@CurrentUser() user: AuthenticatedUser) {
    return this.accountingService.seedDefaultChartOfAccounts(user.tenantId);
  }

  @Get('journal-entries')
  @RequirePermissions('accounting.entries.read')
  findEntries(@CurrentUser() user: AuthenticatedUser, @Query() query: ListJournalEntriesQueryDto) {
    return this.accountingService.findEntriesPaginated(user.tenantId, query);
  }

  @Post('journal-entries')
  @RequirePermissions('accounting.entries.write')
  createEntry(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createManualEntry(user.tenantId, user.userId, dto);
  }

  @Get('journal-entries/:id')
  @RequirePermissions('accounting.entries.read')
  findEntry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.accountingService.findEntry(user.tenantId, id);
  }

  @Get('cash-accounts')
  @RequirePermissions('accounting.entries.read')
  findCashAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.accountingService.findCashAccounts(user.tenantId);
  }

  @Post('cash-accounts')
  @RequirePermissions('accounting.entries.write')
  createCashAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCashAccountDto) {
    return this.accountingService.createCashAccount(user.tenantId, dto);
  }

  @Patch('cash-accounts/:id')
  @RequirePermissions('accounting.entries.write')
  updateCashAccount(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCashAccountDto) {
    return this.accountingService.updateCashAccount(user.tenantId, id, dto);
  }

  @Post('cash-accounts/:id/deposit')
  @RequirePermissions('accounting.entries.write')
  deposit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DepositDto) {
    return this.accountingService.deposit(user.tenantId, user.userId, id, dto);
  }

  @Post('cash-accounts/:id/withdraw')
  @RequirePermissions('accounting.entries.write')
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: WithdrawDto) {
    return this.accountingService.withdraw(user.tenantId, user.userId, id, dto);
  }

  @Post('cash-accounts/:id/transfer')
  @RequirePermissions('accounting.entries.write')
  transfer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: TransferDto) {
    return this.accountingService.transfer(user.tenantId, user.userId, id, dto);
  }

  @Get('cash-accounts/:id/transactions')
  @RequirePermissions('accounting.entries.read')
  findCashTransactions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.accountingService.findCashTransactions(user.tenantId, id);
  }

  @Get('reports/trial-balance')
  @RequirePermissions('accounting.entries.read')
  trialBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.accountingService.trialBalance(user.tenantId);
  }

  @Get('reports/balance-sheet')
  @RequirePermissions('accounting.entries.read')
  balanceSheet(@CurrentUser() user: AuthenticatedUser) {
    return this.accountingService.balanceSheet(user.tenantId);
  }

  @Get('reports/income-statement')
  @RequirePermissions('accounting.entries.read')
  incomeStatement(@CurrentUser() user: AuthenticatedUser, @Query() query: IncomeStatementQueryDto) {
    return this.accountingService.incomeStatement(user.tenantId, query.from, query.to);
  }
}
