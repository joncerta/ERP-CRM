import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum CashAccountType {
  CASH = 'cash',
  BANK = 'bank',
}

/** A till or bank account the tenant actually operates — linked to its
 * matching asset account in the chart of accounts so deposits/withdrawals/
 * transfers can post a real journal entry. `balance` is denormalized and
 * kept in sync transactionally, same pattern as StockBalance. */
@Entity('accounting_cash_accounts')
export class CashAccount extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: CashAccountType, default: CashAccountType.CASH })
  type: CashAccountType;

  @Index()
  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
