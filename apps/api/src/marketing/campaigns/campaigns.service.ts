import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignChannel, CampaignStatus } from './entities/campaign.entity';
import { CampaignRecipient, CampaignRecipientStatus } from './entities/campaign-recipient.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';
import { ContactsService } from '../../crm/contacts/contacts.service';
import { EmailService } from '../../common/email/email.service';
import { CommunicationsService } from '../../documents/communications.service';
import { CommunicationChannel } from '../../documents/entities/communication-log-entry.entity';

@Injectable()
export class CampaignsService extends TenantScopedService<Campaign> {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign) repo: Repository<Campaign>,
    @InjectRepository(CampaignRecipient) private readonly recipientsRepo: Repository<CampaignRecipient>,
    private readonly contactsService: ContactsService,
    private readonly emailService: EmailService,
    private readonly communicationsService: CommunicationsService,
  ) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<Campaign>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'campaign',
      searchColumns: ['name'],
      sortableColumns: ['name', 'channel', 'status', 'createdAt'],
      defaultSortBy: 'createdAt',
    });
  }

  create(tenantId: string, userId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.repository.create({
      tenantId,
      name: dto.name,
      channel: dto.channel,
      status: CampaignStatus.DRAFT,
      subject: dto.subject ?? null,
      content: dto.content,
      sentAt: null,
      createdByUserId: userId,
    });
    return this.repository.save(campaign);
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOneForTenant(tenantId, id);
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden editar campañas en borrador');
    }
    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.channel !== undefined) campaign.channel = dto.channel;
    if (dto.subject !== undefined) campaign.subject = dto.subject;
    if (dto.content !== undefined) campaign.content = dto.content;
    return this.repository.save(campaign);
  }

  async cancel(tenantId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOneForTenant(tenantId, id);
    if (campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('No se puede cancelar una campaña ya enviada');
    }
    campaign.status = CampaignStatus.CANCELLED;
    return this.repository.save(campaign);
  }

  /** Email actually goes out via EmailService (real SMTP, same as
   * Cotizaciones). SMS/WhatsApp have no gateway configured in this
   * project (no Twilio/Meta credentials) — those channels are logged as
   * "simulated" sends rather than silently pretending to deliver, so it's
   * obvious from the recipient list what really left the building. */
  async send(tenantId: string, userId: string, id: string, dto: SendCampaignDto): Promise<Campaign> {
    const campaign = await this.findOneForTenant(tenantId, id);
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Esta campaña ya fue enviada o cancelada');
    }

    for (const contactId of dto.contactIds) {
      const contact = await this.contactsService.findOneForTenant(tenantId, contactId).catch(() => null);
      if (!contact) {
        await this.recordRecipient(tenantId, campaign.id, contactId, CampaignRecipientStatus.FAILED, 'Contacto no encontrado');
        continue;
      }

      if (campaign.channel === CampaignChannel.EMAIL) {
        if (!contact.email) {
          await this.recordRecipient(tenantId, campaign.id, contactId, CampaignRecipientStatus.FAILED, 'El contacto no tiene correo registrado');
          continue;
        }
        try {
          await this.emailService.send({ to: contact.email, subject: campaign.subject ?? campaign.name, html: campaign.content });
          await this.recordRecipient(tenantId, campaign.id, contactId, CampaignRecipientStatus.SENT, null);
          await this.communicationsService.logAutomatic(tenantId, contact.id, CommunicationChannel.EMAIL, `Campaña "${campaign.name}" enviada por correo`);
        } catch (err) {
          await this.recordRecipient(tenantId, campaign.id, contactId, CampaignRecipientStatus.FAILED, (err as Error).message);
        }
        continue;
      }

      const destination = campaign.channel === CampaignChannel.SMS ? contact.phone : contact.whatsapp;
      if (!destination) {
        await this.recordRecipient(
          tenantId,
          campaign.id,
          contactId,
          CampaignRecipientStatus.FAILED,
          campaign.channel === CampaignChannel.SMS ? 'El contacto no tiene teléfono registrado' : 'El contacto no tiene WhatsApp registrado',
        );
        continue;
      }
      this.logger.warn(`Envío de ${campaign.channel} simulado a ${destination} (sin pasarela configurada): "${campaign.name}"`);
      await this.recordRecipient(tenantId, campaign.id, contactId, CampaignRecipientStatus.SIMULATED, null);
      await this.communicationsService.logAutomatic(
        tenantId,
        contact.id,
        campaign.channel === CampaignChannel.SMS ? CommunicationChannel.SMS : CommunicationChannel.WHATSAPP,
        `Campaña "${campaign.name}" enviada (simulada) por ${campaign.channel}`,
      );
    }

    campaign.status = CampaignStatus.SENT;
    campaign.sentAt = new Date();
    return this.repository.save(campaign);
  }

  private async recordRecipient(
    tenantId: string,
    campaignId: string,
    contactId: string,
    status: CampaignRecipientStatus,
    failureReason: string | null,
  ): Promise<void> {
    await this.recipientsRepo.save(
      this.recipientsRepo.create({
        tenantId,
        campaignId,
        contactId,
        status,
        failureReason,
        sentAt: [CampaignRecipientStatus.SENT, CampaignRecipientStatus.SIMULATED].includes(status) ? new Date() : null,
      }),
    );
  }

  findRecipients(tenantId: string, campaignId: string): Promise<CampaignRecipient[]> {
    return this.recipientsRepo.find({ where: { tenantId, campaignId }, order: { sentAt: 'DESC' } });
  }
}
