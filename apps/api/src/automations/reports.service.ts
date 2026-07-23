import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity, OpportunityStatus } from '../crm/opportunities/entities/opportunity.entity';
import { Invoice } from '../finance/invoices/entities/invoice.entity';
import { Lead, LeadStatus } from '../crm/leads/entities/lead.entity';
import { User } from '../core/users/entities/user.entity';
import { Company } from '../crm/companies/entities/company.entity';

export interface RepReportRow {
  ownerUserId: string;
  ownerName: string;
  wonOpportunities: number;
  wonValue: number;
  invoicedTotal: number;
}

export interface ClientReportRow {
  companyId: string;
  companyName: string;
  invoiceCount: number;
  invoicedTotal: number;
}

export interface CampaignReportRow {
  campaign: string;
  leadCount: number;
  convertedCount: number;
}

export interface ForecastRow {
  month: string;
  weightedValue: number;
  openCount: number;
}

/** Read-only, computed on the fly from what already exists — no new
 * tables. Real Excel (.xlsx) / Power BI / Looker Studio integration would
 * need a charting/export library or an external connector this project
 * doesn't have; CSV export (below, in the controller) covers "open this
 * in Excel" honestly without adding that dependency. */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Opportunity) private readonly opportunitiesRepo: Repository<Opportunity>,
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Company) private readonly companiesRepo: Repository<Company>,
  ) {}

  async byRep(tenantId: string): Promise<RepReportRow[]> {
    const users = await this.usersRepo.find({ where: { tenantId } });
    const userNames = new Map(users.map((u) => [u.id, u.fullName]));

    const wonRows = await this.opportunitiesRepo
      .createQueryBuilder('o')
      .select('o.ownerUserId', 'ownerUserId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(o.value)', 'value')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status = :status', { status: OpportunityStatus.WON })
      .andWhere('o.ownerUserId IS NOT NULL')
      .groupBy('o.ownerUserId')
      .getRawMany<{ ownerUserId: string; count: string; value: string }>();

    const invoiceRows = await this.invoicesRepo
      .createQueryBuilder('i')
      .select('i.ownerUserId', 'ownerUserId')
      .addSelect('SUM(i.total)', 'total')
      .where('i.tenantId = :tenantId', { tenantId })
      .groupBy('i.ownerUserId')
      .getRawMany<{ ownerUserId: string; total: string }>();
    const invoicedByUser = new Map(invoiceRows.map((r) => [r.ownerUserId, Number(r.total)]));

    return wonRows
      .map((r) => ({
        ownerUserId: r.ownerUserId,
        ownerName: userNames.get(r.ownerUserId) ?? r.ownerUserId,
        wonOpportunities: Number(r.count),
        wonValue: Number(r.value),
        invoicedTotal: invoicedByUser.get(r.ownerUserId) ?? 0,
      }))
      .sort((a, b) => b.wonValue - a.wonValue);
  }

  async byClient(tenantId: string): Promise<ClientReportRow[]> {
    const rows = await this.invoicesRepo
      .createQueryBuilder('i')
      .select('i.companyId', 'companyId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(i.total)', 'total')
      .where('i.tenantId = :tenantId', { tenantId })
      .groupBy('i.companyId')
      .getRawMany<{ companyId: string; count: string; total: string }>();

    const companies = await this.companiesRepo.find({ where: { tenantId } });
    const companyNames = new Map(companies.map((c) => [c.id, c.name]));

    return rows
      .map((r) => ({
        companyId: r.companyId,
        companyName: companyNames.get(r.companyId) ?? r.companyId,
        invoiceCount: Number(r.count),
        invoicedTotal: Number(r.total),
      }))
      .sort((a, b) => b.invoicedTotal - a.invoicedTotal);
  }

  async byCampaign(tenantId: string): Promise<CampaignReportRow[]> {
    const rows = await this.leadsRepo
      .createQueryBuilder('lead')
      .select('COALESCE(lead.campaign, lead.source, :none)', 'campaign')
      .addSelect('COUNT(*)', 'count')
      .addSelect(`SUM(CASE WHEN lead.status = :converted THEN 1 ELSE 0 END)`, 'converted')
      .where('lead.tenantId = :tenantId', { tenantId })
      .setParameter('none', 'Sin campaña')
      .setParameter('converted', LeadStatus.CONVERTED)
      .groupBy('campaign')
      .getRawMany<{ campaign: string; count: string; converted: string }>();

    return rows
      .map((r) => ({ campaign: r.campaign, leadCount: Number(r.count), convertedCount: Number(r.converted) }))
      .sort((a, b) => b.leadCount - a.leadCount);
  }

  /** Weighted pipeline forecast: open opportunities' value × probability,
   * grouped by expected close month — the same probability the pipeline
   * stage already carries, not a separately modeled forecast. */
  async forecast(tenantId: string): Promise<ForecastRow[]> {
    const rows = await this.opportunitiesRepo
      .createQueryBuilder('o')
      .select(`COALESCE(TO_CHAR(o.expectedCloseDate, 'YYYY-MM'), 'sin_fecha')`, 'month')
      .addSelect('SUM(o.value * o.probability / 100.0)', 'weightedValue')
      .addSelect('COUNT(*)', 'count')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status = :status', { status: OpportunityStatus.OPEN })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; weightedValue: string; count: string }>();

    return rows.map((r) => ({ month: r.month, weightedValue: Number(r.weightedValue), openCount: Number(r.count) }));
  }
}
