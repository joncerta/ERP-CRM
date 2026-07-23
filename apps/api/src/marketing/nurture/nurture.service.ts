import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { NurtureSequence } from './entities/nurture-sequence.entity';
import { NurtureEnrollment, NurtureEnrollmentStatus } from './entities/nurture-enrollment.entity';
import { CreateNurtureSequenceDto } from './dto/create-nurture-sequence.dto';
import { UpdateNurtureSequenceDto } from './dto/update-nurture-sequence.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ContactsService } from '../../crm/contacts/contacts.service';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class NurtureService extends TenantScopedService<NurtureSequence> {
  private readonly logger = new Logger(NurtureService.name);

  constructor(
    @InjectRepository(NurtureSequence) repo: Repository<NurtureSequence>,
    @InjectRepository(NurtureEnrollment) private readonly enrollmentsRepo: Repository<NurtureEnrollment>,
    private readonly contactsService: ContactsService,
    private readonly emailService: EmailService,
  ) {
    super(repo);
  }

  create(tenantId: string, dto: CreateNurtureSequenceDto): Promise<NurtureSequence> {
    const sequence = this.repository.create({ tenantId, name: dto.name, steps: dto.steps, active: true });
    return this.repository.save(sequence);
  }

  async update(tenantId: string, id: string, dto: UpdateNurtureSequenceDto): Promise<NurtureSequence> {
    const sequence = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) sequence.name = dto.name;
    if (dto.steps !== undefined) sequence.steps = dto.steps;
    if (dto.active !== undefined) sequence.active = dto.active;
    return this.repository.save(sequence);
  }

  async enroll(tenantId: string, sequenceId: string, contactIds: string[]): Promise<NurtureEnrollment[]> {
    const sequence = await this.findOneForTenant(tenantId, sequenceId);
    if (!sequence.steps.length) {
      throw new BadRequestException('La secuencia no tiene pasos configurados');
    }
    const enrollments = contactIds.map((contactId) =>
      this.enrollmentsRepo.create({
        tenantId,
        sequenceId: sequence.id,
        contactId,
        status: NurtureEnrollmentStatus.ACTIVE,
        currentStep: 0,
        nextStepDueAt: this.addDays(new Date(), sequence.steps[0].delayDays),
        lastStepSentAt: null,
      }),
    );
    return this.enrollmentsRepo.save(enrollments);
  }

  findEnrollments(tenantId: string, sequenceId: string): Promise<NurtureEnrollment[]> {
    return this.enrollmentsRepo.find({ where: { tenantId, sequenceId }, order: { createdAt: 'DESC' } });
  }

  async cancelEnrollment(tenantId: string, id: string): Promise<NurtureEnrollment> {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { tenantId, id } });
    if (!enrollment) throw new BadRequestException('Inscripción no encontrada');
    enrollment.status = NurtureEnrollmentStatus.CANCELLED;
    return this.enrollmentsRepo.save(enrollment);
  }

  /** Manual trigger (no in-process scheduler in this project, same
   * limitation as depreciation/recurring invoices) — a person, or an
   * external cron hitting this endpoint, advances every enrollment whose
   * step has come due. Sends the step's content by email; a contact
   * without an email address is skipped for that round and retried next
   * time this runs since nextStepDueAt is only advanced on send. */
  async process(tenantId: string): Promise<{ processed: number; sent: number; completed: number }> {
    const due = await this.enrollmentsRepo.find({
      where: { tenantId, status: NurtureEnrollmentStatus.ACTIVE, nextStepDueAt: LessThanOrEqual(new Date()) },
    });
    let sent = 0;
    let completed = 0;
    for (const enrollment of due) {
      const sequence = await this.repository.findOne({ where: { tenantId, id: enrollment.sequenceId } });
      if (!sequence || !sequence.active) {
        enrollment.status = NurtureEnrollmentStatus.CANCELLED;
        await this.enrollmentsRepo.save(enrollment);
        continue;
      }
      const step = sequence.steps[enrollment.currentStep];
      const contact = await this.contactsService.findOneForTenant(tenantId, enrollment.contactId).catch(() => null);
      if (!contact?.email) {
        this.logger.warn(`Nutrición: contacto ${enrollment.contactId} sin correo, se reintentará`);
        continue;
      }
      await this.emailService.send({ to: contact.email, subject: step.subject, html: step.content });
      enrollment.lastStepSentAt = new Date();
      sent += 1;

      const nextIndex = enrollment.currentStep + 1;
      if (nextIndex >= sequence.steps.length) {
        enrollment.status = NurtureEnrollmentStatus.COMPLETED;
        enrollment.nextStepDueAt = null;
        completed += 1;
      } else {
        enrollment.currentStep = nextIndex;
        enrollment.nextStepDueAt = this.addDays(new Date(), sequence.steps[nextIndex].delayDays);
      }
      await this.enrollmentsRepo.save(enrollment);
    }
    return { processed: due.length, sent, completed };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
