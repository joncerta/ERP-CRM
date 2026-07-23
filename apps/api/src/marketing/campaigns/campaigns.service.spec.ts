import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CampaignsService } from './campaigns.service';
import { Campaign, CampaignChannel, CampaignStatus } from './entities/campaign.entity';
import { CampaignRecipient, CampaignRecipientStatus } from './entities/campaign-recipient.entity';
import { ContactsService } from '../../crm/contacts/contacts.service';
import { EmailService } from '../../common/email/email.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'campaign-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Campaign>>;
  const recipientsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'recipient-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<CampaignRecipient>>;
  const contactsService = {
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<ContactsService>;
  const emailService = {
    send: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EmailService>;
  return { repo, recipientsRepo, contactsService, emailService };
}

function buildService() {
  const deps = buildDeps();
  const service = new CampaignsService(deps.repo, deps.recipientsRepo, deps.contactsService, deps.emailService);
  return { service, ...deps };
}

describe('CampaignsService', () => {
  describe('send', () => {
    it('sends a real email and records the recipient as sent', async () => {
      const { service, repo, recipientsRepo, contactsService, emailService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'campaign-1',
        tenantId: 'tenant-a',
        channel: CampaignChannel.EMAIL,
        status: CampaignStatus.DRAFT,
        subject: 'Hola',
        content: '<p>Hola</p>',
        name: 'Campaña',
      } as Campaign);
      contactsService.findOneForTenant.mockResolvedValue({ id: 'contact-1', email: 'cliente@example.com' } as any);

      const campaign = await service.send('tenant-a', 'user-1', 'campaign-1', { contactIds: ['contact-1'] });

      expect(emailService.send).toHaveBeenCalledWith({ to: 'cliente@example.com', subject: 'Hola', html: '<p>Hola</p>' });
      expect(recipientsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: CampaignRecipientStatus.SENT }));
      expect(campaign.status).toBe(CampaignStatus.SENT);
      expect(campaign.sentAt).toBeInstanceOf(Date);
    });

    it('marks an SMS/WhatsApp send as simulated instead of pretending to deliver it', async () => {
      const { service, repo, recipientsRepo, contactsService, emailService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'campaign-1',
        tenantId: 'tenant-a',
        channel: CampaignChannel.WHATSAPP,
        status: CampaignStatus.DRAFT,
        name: 'Campaña WA',
      } as Campaign);
      contactsService.findOneForTenant.mockResolvedValue({ id: 'contact-1', whatsapp: '+573001234567' } as any);

      await service.send('tenant-a', 'user-1', 'campaign-1', { contactIds: ['contact-1'] });

      expect(emailService.send).not.toHaveBeenCalled();
      expect(recipientsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: CampaignRecipientStatus.SIMULATED }));
    });

    it('fails the recipient when the contact has no email for an email campaign', async () => {
      const { service, repo, recipientsRepo, contactsService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'campaign-1',
        tenantId: 'tenant-a',
        channel: CampaignChannel.EMAIL,
        status: CampaignStatus.DRAFT,
        name: 'Campaña',
      } as Campaign);
      contactsService.findOneForTenant.mockResolvedValue({ id: 'contact-1', email: null } as any);

      await service.send('tenant-a', 'user-1', 'campaign-1', { contactIds: ['contact-1'] });

      expect(recipientsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: CampaignRecipientStatus.FAILED }));
    });

    it('refuses to send a campaign that already left draft', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'campaign-1', tenantId: 'tenant-a', status: CampaignStatus.SENT } as Campaign);

      await expect(service.send('tenant-a', 'user-1', 'campaign-1', { contactIds: ['contact-1'] })).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('refuses to cancel a campaign already sent', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'campaign-1', tenantId: 'tenant-a', status: CampaignStatus.SENT } as Campaign);

      await expect(service.cancel('tenant-a', 'campaign-1')).rejects.toThrow(BadRequestException);
    });
  });
});
