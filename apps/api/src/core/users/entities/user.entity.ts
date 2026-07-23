import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
@Index(['passwordResetToken'])
export class User extends TenantScopedEntity {
  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'preferred_locale', default: 'es' })
  preferredLocale: string;

  @Column({ name: 'password_reset_token', type: 'varchar', nullable: true })
  passwordResetToken: string | null;

  @Column({ name: 'password_reset_expires_at', type: 'timestamptz', nullable: true })
  passwordResetExpiresAt: Date | null;

  /** Reporting hierarchy: who this user's manager/coordinator is, for
   * hierarchy-aware notification escalation. Self-referencing, so it's a
   * plain nullable column rather than a typed relation to avoid a circular
   * eager-load. */
  @Index()
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Index()
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  positionId: string | null;
}
