import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/** A tenant's own tax catalog (e.g. "IVA 19%", "IVA 5%", "Exento") — lets
 * Cotizaciones and Facturas pick which one applies per document instead of
 * typing a bare percentage by hand every time. Replaces the old single
 * Tenant.taxLabel/taxRatePercent pair, which only supported one default
 * tax for the whole tenant. */
@Entity('core_taxes')
@Index(['tenantId', 'name'], { unique: true })
export class Tax extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  rate: number;

  /** Pre-selected on new quotes/invoices when set — only one tax per
   * tenant may be the default (enforced in TaxesService). */
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
