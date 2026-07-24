import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum DocumentType {
  CC = 'cc',
  CE = 'ce',
  PASSPORT = 'passport',
  OTHER = 'other',
}

export enum ContractType {
  INDEFINITE = 'indefinite',
  FIXED_TERM = 'fixed_term',
  SERVICE_PROVISION = 'service_provision',
  APPRENTICESHIP = 'apprenticeship',
}

export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
}

/** The HR "hoja de vida" (personnel file) — a 1:1 extension of a login
 * User with contract/personal data that has no business being on the auth
 * entity (User stays focused on login + reporting hierarchy: managerId,
 * branchId, departmentId, positionId already live there and are reused
 * here rather than duplicated). */
@Entity('hr_employees')
export class Employee extends TenantScopedEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'document_type', type: 'enum', enum: DocumentType, default: DocumentType.CC })
  documentType: DocumentType;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'emergency_contact_name', type: 'varchar', nullable: true })
  emergencyContactName: string | null;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', nullable: true })
  emergencyContactPhone: string | null;

  @Column({ name: 'contract_type', type: 'enum', enum: ContractType, default: ContractType.INDEFINITE })
  contractType: ContractType;

  @Column({ name: 'base_salary', type: 'numeric', precision: 14, scale: 2 })
  baseSalary: number;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: string;

  @Column({ name: 'termination_date', type: 'date', nullable: true })
  terminationDate: string | null;

  /** Colombian legal standard (15 working days/year of service), used to
   * prorate the vacation balance shown to the employee — see
   * LeaveRequestsService.getVacationBalance() for the simplified accrual
   * math (calendar-day proration, not the full legal calendar with
   * suspensions/incapacities factored in). */
  @Column({ name: 'vacation_days_per_year', default: 15 })
  vacationDaysPerYear: number;

  @Column({ name: 'employment_status', type: 'enum', enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  employmentStatus: EmploymentStatus;
}
