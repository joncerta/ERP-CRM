import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteFollowUp, QuoteFollowUpStatus } from './entities/quote-follow-up.entity';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

@Injectable()
export class QuoteFollowUpsService extends TenantScopedService<QuoteFollowUp> {
  constructor(@InjectRepository(QuoteFollowUp) repo: Repository<QuoteFollowUp>) {
    super(repo);
  }

  create(tenantId: string, quoteId: string, requestedByUserId: string, dto: CreateFollowUpDto): Promise<QuoteFollowUp> {
    const followUp = this.repository.create({
      tenantId,
      quoteId,
      dueAt: new Date(dto.dueAt),
      note: dto.note,
      assignedToUserId: dto.assignedToUserId ?? requestedByUserId,
    });
    return this.repository.save(followUp);
  }

  findByQuote(tenantId: string, quoteId: string): Promise<QuoteFollowUp[]> {
    return this.repository.find({ where: { tenantId, quoteId }, order: { dueAt: 'ASC' } });
  }

  findPendingForTenant(tenantId: string): Promise<QuoteFollowUp[]> {
    return this.repository.find({
      where: { tenantId, status: QuoteFollowUpStatus.PENDING },
      order: { dueAt: 'ASC' },
    });
  }

  async markDone(tenantId: string, id: string): Promise<QuoteFollowUp> {
    const followUp = await this.findOneForTenant(tenantId, id);
    followUp.status = QuoteFollowUpStatus.DONE;
    followUp.completedAt = new Date();
    return this.repository.save(followUp);
  }
}
