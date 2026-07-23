import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  INCOME = 'income',
  EXPENSE = 'expense',
}

/** Deliberately flat — no parent/child hierarchy. A lightweight chart of
 * accounts, not a full NIIF-compliant one, matching the same "manageable
 * scope" decision already made for Facturación (not electronic invoicing). */
@Entity('accounting_accounts')
@Unique(['tenantId', 'code'])
export class Account extends TenantScopedEntity {
  @Index()
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
