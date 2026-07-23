import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { LandingFormsService } from './landing-forms.service';
import { SubmitLandingFormDto } from './dto/submit-landing-form.dto';
import { TenantsService } from '../../core/tenants/tenants.service';
import { Public } from '../../common/decorators/public.decorator';

/** Real, functional capture endpoint any external form (a tenant's own
 * landing page, or a no-code form builder) can POST to. Wiring Meta/LinkedIn
 * lead-ads webhooks directly would need their API credentials, which this
 * project doesn't have — that stays documented as pending. This endpoint is
 * the honest, working piece: point any HTML form's action at it. */
@Controller('public/marketing')
export class LandingFormsPublicController {
  constructor(
    private readonly landingFormsService: LandingFormsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Public()
  @Post(':tenantSlug/forms/:formSlug')
  async submit(@Param('tenantSlug') tenantSlug: string, @Param('formSlug') formSlug: string, @Body() dto: SubmitLandingFormDto) {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    if (!tenant) throw new BadRequestException('Empresa no encontrada');
    const form = await this.landingFormsService.findBySlug(tenant.id, formSlug);
    if (!form || !form.active) throw new BadRequestException('Formulario no encontrado');
    await this.landingFormsService.submit(tenant.id, form, dto);
    return { ok: true };
  }
}
