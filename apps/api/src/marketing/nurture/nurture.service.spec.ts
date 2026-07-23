import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NurtureService } from './nurture.service';
import { NurtureSequence } from './entities/nurture-sequence.entity';
import { NurtureEnrollment, NurtureEnrollmentStatus } from './entities/nurture-enrollment.entity';
import { ContactsService } from '../../crm/contacts/contacts.service';
import { EmailService } from '../../common/email/email.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'sequence-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<NurtureSequence>>;
  const enrollmentsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => (Array.isArray(data) ? data.map((d, i) => ({ id: `enrollment-${i}`, ...d })) : { id: 'enrollment-1', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<NurtureEnrollment>>;
  const contactsService = {
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<ContactsService>;
  const emailService = {
    send: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EmailService>;
  return { repo, enrollmentsRepo, contactsService, emailService };
}

function buildService() {
  const deps = buildDeps();
  const service = new NurtureService(deps.repo, deps.enrollmentsRepo, deps.contactsService, deps.emailService);
  return { service, ...deps };
}

describe('NurtureService', () => {
  describe('enroll', () => {
    it('refuses to enroll into a sequence with no steps', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'sequence-1', tenantId: 'tenant-a', steps: [] } as unknown as NurtureSequence);

      await expect(service.enroll('tenant-a', 'sequence-1', ['contact-1'])).rejects.toThrow(BadRequestException);
    });

    it('schedules the first step using its delayDays', async () => {
      const { service, repo, enrollmentsRepo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'sequence-1',
        tenantId: 'tenant-a',
        steps: [{ delayDays: 3, subject: 'Bienvenida', content: 'Hola' }],
      } as unknown as NurtureSequence);
      const before = Date.now();

      await service.enroll('tenant-a', 'sequence-1', ['contact-1']);

      const saved = enrollmentsRepo.save.mock.calls[0][0][0];
      expect(saved.currentStep).toBe(0);
      const dueMs = (saved.nextStepDueAt as Date).getTime() - before;
      expect(dueMs).toBeGreaterThan(2.9 * 24 * 60 * 60 * 1000);
      expect(dueMs).toBeLessThan(3.1 * 24 * 60 * 60 * 1000);
    });
  });

  describe('process', () => {
    it('sends the current step by email and advances to the next one', async () => {
      const { service, repo, enrollmentsRepo, contactsService, emailService } = buildService();
      enrollmentsRepo.find.mockResolvedValue([
        {
          id: 'enrollment-1',
          tenantId: 'tenant-a',
          sequenceId: 'sequence-1',
          contactId: 'contact-1',
          status: NurtureEnrollmentStatus.ACTIVE,
          currentStep: 0,
        } as NurtureEnrollment,
      ]);
      repo.findOne.mockResolvedValue({
        id: 'sequence-1',
        tenantId: 'tenant-a',
        active: true,
        steps: [
          { delayDays: 0, subject: 'Paso 1', content: 'Hola' },
          { delayDays: 5, subject: 'Paso 2', content: 'Seguimos' },
        ],
      } as unknown as NurtureSequence);
      contactsService.findOneForTenant.mockResolvedValue({ id: 'contact-1', email: 'cliente@example.com' } as any);

      const result = await service.process('tenant-a');

      expect(emailService.send).toHaveBeenCalledWith({ to: 'cliente@example.com', subject: 'Paso 1', html: 'Hola' });
      expect(result).toEqual({ processed: 1, sent: 1, completed: 0 });
      const saved = enrollmentsRepo.save.mock.calls[0][0];
      expect(saved.currentStep).toBe(1);
      expect(saved.nextStepDueAt).toBeInstanceOf(Date);
    });

    it('marks the enrollment completed after sending the last step', async () => {
      const { service, repo, enrollmentsRepo, contactsService } = buildService();
      enrollmentsRepo.find.mockResolvedValue([
        {
          id: 'enrollment-1',
          tenantId: 'tenant-a',
          sequenceId: 'sequence-1',
          contactId: 'contact-1',
          status: NurtureEnrollmentStatus.ACTIVE,
          currentStep: 1,
        } as NurtureEnrollment,
      ]);
      repo.findOne.mockResolvedValue({
        id: 'sequence-1',
        tenantId: 'tenant-a',
        active: true,
        steps: [
          { delayDays: 0, subject: 'Paso 1', content: 'Hola' },
          { delayDays: 5, subject: 'Paso 2', content: 'Seguimos' },
        ],
      } as unknown as NurtureSequence);
      contactsService.findOneForTenant.mockResolvedValue({ id: 'contact-1', email: 'cliente@example.com' } as any);

      const result = await service.process('tenant-a');

      expect(result).toEqual({ processed: 1, sent: 1, completed: 1 });
      const saved = enrollmentsRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(NurtureEnrollmentStatus.COMPLETED);
      expect(saved.nextStepDueAt).toBeNull();
    });

    it('leaves a contact without email untouched so it retries on the next run', async () => {
      const { service, repo, enrollmentsRepo, contactsService, emailService } = buildService();
      enrollmentsRepo.find.mockResolvedValue([
        {
          id: 'enrollment-1',
          tenantId: 'tenant-a',
          sequenceId: 'sequence-1',
          contactId: 'contact-1',
          status: NurtureEnrollmentStatus.ACTIVE,
          currentStep: 0,
        } as NurtureEnrollment,
      ]);
      repo.findOne.mockResolvedValue({
        id: 'sequence-1',
        tenantId: 'tenant-a',
        active: true,
        steps: [{ delayDays: 0, subject: 'Paso 1', content: 'Hola' }],
      } as unknown as NurtureSequence);
      contactsService.findOneForTenant.mockResolvedValue({ id: 'contact-1', email: null } as any);

      const result = await service.process('tenant-a');

      expect(emailService.send).not.toHaveBeenCalled();
      expect(enrollmentsRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 1, sent: 0, completed: 0 });
    });
  });
});
