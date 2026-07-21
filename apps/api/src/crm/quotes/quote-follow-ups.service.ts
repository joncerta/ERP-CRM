import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteFollowUp, QuoteFollowUpStatus } from './entities/quote-follow-up.entity';
import { Quote } from './entities/quote.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

export interface PendingFollowUp {
  id: string;
  quoteId: string;
  dueAt: Date;
  note: string | null;
  status: QuoteFollowUpStatus;
  assignedToUserId: string;
  quoteNumber: string;
  quoteStatus: string;
  companyId: string;
  companyName: string;
}

@Injectable()
export class QuoteFollowUpsService extends TenantScopedService<QuoteFollowUp> {
  constructor(
    @InjectRepository(QuoteFollowUp) repo: Repository<QuoteFollowUp>,
    @InjectRepository(Quote) private readonly quotesRepo: Repository<Quote>,
    @InjectRepository(Company) private readonly companiesRepo: Repository<Company>,
  ) {
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

  /** Pending follow-ups with just enough quote/company context to render a reminders list. */
  async findPendingForTenant(tenantId: string): Promise<PendingFollowUp[]> {
    const followUps = await this.repository.find({
      where: { tenantId, status: QuoteFollowUpStatus.PENDING },
      order: { dueAt: 'ASC' },
    });
    if (followUps.length === 0) return [];

    const quoteIds = [...new Set(followUps.map((f) => f.quoteId))];
    const quotes = await this.quotesRepo.find({
      where: { tenantId },
      select: { id: true, quoteNumber: true, status: true, companyId: true },
    });
    const quotesById = new Map(quotes.filter((q) => quoteIds.includes(q.id)).map((q) => [q.id, q]));

    const companyIds = [...new Set([...quotesById.values()].map((q) => q.companyId))];
    const companies = await this.companiesRepo.find({ where: { tenantId }, select: { id: true, name: true } });
    const companiesById = new Map(companies.filter((c) => companyIds.includes(c.id)).map((c) => [c.id, c]));

    return followUps.map((followUp): PendingFollowUp => {
      const quote = quotesById.get(followUp.quoteId);
      const company = quote ? companiesById.get(quote.companyId) : undefined;
      return {
        id: followUp.id,
        quoteId: followUp.quoteId,
        dueAt: followUp.dueAt,
        note: followUp.note,
        status: followUp.status,
        assignedToUserId: followUp.assignedToUserId,
        quoteNumber: quote?.quoteNumber ?? '—',
        quoteStatus: quote?.status ?? 'unknown',
        companyId: quote?.companyId ?? '',
        companyName: company?.name ?? '—',
      };
    });
  }

  async markDone(tenantId: string, id: string): Promise<QuoteFollowUp> {
    const followUp = await this.findOneForTenant(tenantId, id);
    followUp.status = QuoteFollowUpStatus.DONE;
    followUp.completedAt = new Date();
    return this.repository.save(followUp);
  }
}
