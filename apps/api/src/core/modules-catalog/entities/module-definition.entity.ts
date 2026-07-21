import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Global catalog of activatable modules (CRM, Ventas, Inventario, ...).
 * Seeded once; tenants opt in via TenantModule.
 */
@Entity('module_definitions')
export class ModuleDefinition extends BaseEntity {
  @PrimaryColumn()
  code: string; // e.g. "crm"

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'is_core', default: false })
  isCore: boolean; // core modules can't be disabled per tenant
}
