import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest, LeaveRequestStatus, LeaveType } from './entities/leave-request.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../../core/users/entities/user.entity';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

@Injectable()
export class LeaveRequestsService extends TenantScopedService<LeaveRequest> {
  constructor(
    @InjectRepository(LeaveRequest) repo: Repository<LeaveRequest>,
    @InjectRepository(Employee) private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly notificationEscalationService: NotificationEscalationService,
    private readonly notificationsService: NotificationsService,
  ) {
    super(repo);
  }

  async create(tenantId: string, actingUser: AuthenticatedUser, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const employee = await this.employeesRepo.findOne({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new BadRequestException('Empleado no encontrado');

    // Anyone with hr.leave_requests.write can request their own leave;
    // only a full admin ('*') can file one on someone else's behalf.
    if (employee.userId !== actingUser.userId && !actingUser.permissions.includes('*')) {
      throw new ForbiddenException('Solo puedes solicitar vacaciones/licencias para ti mismo');
    }

    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio');
    }
    const daysRequested = daysBetweenInclusive(dto.startDate, dto.endDate);

    const request = await this.repository.save(
      this.repository.create({
        tenantId,
        employeeId: dto.employeeId,
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysRequested,
        reason: dto.reason ?? null,
        status: LeaveRequestStatus.PENDING,
      }),
    );

    await this.notificationEscalationService.notifyWithEscalation(
      tenantId,
      employee.userId,
      'hr.leave_request',
      'Nueva solicitud de vacaciones/licencia',
      `Solicitud de ${daysRequested} día(s) (${dto.type}) del ${dto.startDate} al ${dto.endDate}`,
      '/hr',
    );

    return request;
  }

  async approve(tenantId: string, actingUser: AuthenticatedUser, id: string, dto: ReviewLeaveRequestDto): Promise<LeaveRequest> {
    return this.review(tenantId, actingUser, id, LeaveRequestStatus.APPROVED, dto);
  }

  async reject(tenantId: string, actingUser: AuthenticatedUser, id: string, dto: ReviewLeaveRequestDto): Promise<LeaveRequest> {
    return this.review(tenantId, actingUser, id, LeaveRequestStatus.REJECTED, dto);
  }

  async cancel(tenantId: string, actingUser: AuthenticatedUser, id: string): Promise<LeaveRequest> {
    const request = await this.findOneForTenant(tenantId, id);
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Solo se pueden cancelar solicitudes pendientes');
    }
    const employee = await this.employeesRepo.findOne({ where: { id: request.employeeId, tenantId } });
    if (employee?.userId !== actingUser.userId && !actingUser.permissions.includes('*')) {
      throw new ForbiddenException('Solo puedes cancelar tus propias solicitudes');
    }
    request.status = LeaveRequestStatus.CANCELLED;
    return this.repository.save(request);
  }

  private async review(
    tenantId: string,
    actingUser: AuthenticatedUser,
    id: string,
    status: LeaveRequestStatus.APPROVED | LeaveRequestStatus.REJECTED,
    dto: ReviewLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const request = await this.findOneForTenant(tenantId, id);
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }
    const employee = await this.employeesRepo.findOne({ where: { id: request.employeeId, tenantId } });
    if (!employee) throw new BadRequestException('Empleado no encontrado');
    const employeeUser = await this.usersRepo.findOne({ where: { id: employee.userId, tenantId } });

    // Only the employee's direct manager (per User.managerId) or a full
    // admin can review — not just anyone holding the write permission.
    if (employeeUser?.managerId !== actingUser.userId && !actingUser.permissions.includes('*')) {
      throw new ForbiddenException('Solo el líder directo del empleado puede revisar esta solicitud');
    }

    request.status = status;
    request.reviewedByUserId = actingUser.userId;
    request.reviewedAt = new Date();
    request.reviewNote = dto.note ?? null;
    const saved = await this.repository.save(request);

    await this.notificationsService.notify(
      tenantId,
      employee.userId,
      `hr.leave_request.${status}`,
      status === LeaveRequestStatus.APPROVED ? 'Solicitud aprobada' : 'Solicitud rechazada',
      `Tu solicitud del ${request.startDate} al ${request.endDate} fue ${status === LeaveRequestStatus.APPROVED ? 'aprobada' : 'rechazada'}${dto.note ? `: ${dto.note}` : ''}`,
      '/hr',
    );

    return saved;
  }

  findForEmployee(tenantId: string, employeeId: string): Promise<LeaveRequest[]> {
    return this.repository.find({ where: { tenantId, employeeId }, order: { createdAt: 'DESC' } });
  }

  /** Simplified prorated accrual: 15 (or the employee's configured)
   * working days per full year of service, prorated by calendar days
   * since hire — not the exact Colombian legal calendar (which excludes
   * suspensions/incapacities from the accrual period). Balance = earned
   * so far minus days already taken via approved vacation requests. */
  async getVacationBalance(tenantId: string, employeeId: string): Promise<{ earned: number; taken: number; balance: number }> {
    const employee = await this.employeesRepo.findOne({ where: { id: employeeId, tenantId } });
    if (!employee) throw new BadRequestException('Empleado no encontrado');

    const daysSinceHire = Math.max(0, daysBetweenInclusive(employee.hireDate, new Date().toISOString().slice(0, 10)) - 1);
    const earned = Math.floor((daysSinceHire / 360) * employee.vacationDaysPerYear);

    const approvedVacations = await this.repository.find({
      where: { tenantId, employeeId, type: LeaveType.VACATION, status: LeaveRequestStatus.APPROVED },
    });
    const taken = approvedVacations.reduce((sum, r) => sum + r.daysRequested, 0);

    return { earned, taken, balance: earned - taken };
  }
}
