import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('crm_companies')
export class Company extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  /** Headcount bucket for Marketing segmentation — a raw count kept
   * simple rather than a size-range enum, since filtering by
   * min/max is just as easy either way. */
  @Column({ name: 'employee_count', type: 'int', nullable: true })
  employeeCount: number | null;
}
