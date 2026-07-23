import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingForm } from './entities/landing-form.entity';
import { CreateLandingFormDto } from './dto/create-landing-form.dto';
import { UpdateLandingFormDto } from './dto/update-landing-form.dto';
import { SubmitLandingFormDto } from './dto/submit-landing-form.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { LeadsService } from '../../crm/leads/leads.service';
import { LeadSource } from './landing-forms.constants';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

@Injectable()
export class LandingFormsService extends TenantScopedService<LandingForm> {
  constructor(
    @InjectRepository(LandingForm) repo: Repository<LandingForm>,
    private readonly leadsService: LeadsService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateLandingFormDto): Promise<LandingForm> {
    const base = slugify(dto.name) || 'formulario';
    let candidate = base;
    let suffix = 2;
    while (await this.repository.findOne({ where: { tenantId, slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    const form = this.repository.create({
      tenantId,
      name: dto.name,
      slug: candidate,
      campaignName: dto.campaignName ?? null,
      active: true,
      submissionCount: 0,
    });
    return this.repository.save(form);
  }

  async update(tenantId: string, id: string, dto: UpdateLandingFormDto): Promise<LandingForm> {
    const form = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) form.name = dto.name;
    if (dto.campaignName !== undefined) form.campaignName = dto.campaignName;
    if (dto.active !== undefined) form.active = dto.active;
    return this.repository.save(form);
  }

  async findBySlug(tenantId: string, slug: string): Promise<LandingForm | null> {
    return this.repository.findOne({ where: { tenantId, slug } });
  }

  /** Public capture: creates a Lead reusing the existing free-text
   * source/campaign fields rather than a new campaignId FK — the form's
   * campaignName (if any) is stored as the lead's campaign, and the
   * source is fixed to 'landing_page' so these leads are easy to filter. */
  async submit(tenantId: string, form: LandingForm, dto: SubmitLandingFormDto): Promise<void> {
    const contactLines = [dto.email ? `Correo: ${dto.email}` : null, dto.phone ? `Teléfono: ${dto.phone}` : null, dto.message ?? null].filter(
      (line): line is string => !!line,
    );
    await this.leadsService.create(tenantId, {
      name: dto.companyName ? `${dto.name} (${dto.companyName})` : dto.name,
      source: LeadSource.LANDING_PAGE,
      campaign: form.campaignName ?? form.name,
      interest: contactLines.join(' · ') || undefined,
    });
    form.submissionCount += 1;
    await this.repository.save(form);
  }
}
