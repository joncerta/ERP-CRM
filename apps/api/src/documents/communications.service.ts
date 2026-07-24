import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunicationLogEntry, CommunicationChannel, CommunicationDirection } from './entities/communication-log-entry.entity';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

@Injectable()
export class CommunicationsService extends TenantScopedService<CommunicationLogEntry> {
  constructor(@InjectRepository(CommunicationLogEntry) repo: Repository<CommunicationLogEntry>) {
    super(repo);
  }

  create(tenantId: string, loggedByUserId: string, dto: CreateCommunicationLogDto): Promise<CommunicationLogEntry> {
    const entry = this.repository.create({
      tenantId,
      contactId: dto.contactId,
      channel: dto.channel,
      direction: dto.direction,
      summary: dto.summary,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      loggedByUserId,
    });
    return this.repository.save(entry);
  }

  findByContact(tenantId: string, contactId: string): Promise<CommunicationLogEntry[]> {
    return this.repository.find({ where: { tenantId, contactId }, order: { occurredAt: 'DESC' } });
  }

  /** Called by other modules right after a real outbound email actually
   * goes out (quote sent, campaign sent) — no loggedByUserId since nobody
   * typed it in, the system did it. */
  logAutomatic(tenantId: string, contactId: string, channel: CommunicationChannel, summary: string): Promise<CommunicationLogEntry> {
    const entry = this.repository.create({
      tenantId,
      contactId,
      channel,
      direction: CommunicationDirection.OUTBOUND,
      summary,
      occurredAt: new Date(),
      loggedByUserId: null,
    });
    return this.repository.save(entry);
  }
}
