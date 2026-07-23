import { Body, Controller, Get, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { AutomationRulesService } from './automation-rules.service';
import { WebhooksService } from './webhooks.service';
import { AutomationsService } from './automations.service';
import { ReportsService } from './reports.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))];
  return lines.join('\n');
}

@Controller('automations')
@RequireModule('automation')
export class AutomationsController {
  constructor(
    private readonly automationRulesService: AutomationRulesService,
    private readonly webhooksService: WebhooksService,
    private readonly automationsService: AutomationsService,
    private readonly reportsService: ReportsService,
  ) {}

  // --- Rules ---
  @Post('rules')
  @RequirePermissions('automation.rules.write')
  createRule(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAutomationRuleDto) {
    return this.automationRulesService.create(user.tenantId, dto);
  }

  @Get('rules')
  @RequirePermissions('automation.rules.read')
  findRules(@CurrentUser() user: AuthenticatedUser) {
    return this.automationRulesService.findAllForTenant(user.tenantId);
  }

  @Patch('rules/:id')
  @RequirePermissions('automation.rules.write')
  updateRule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.automationRulesService.update(user.tenantId, id, dto);
  }

  // --- Webhooks ---
  @Post('webhooks')
  @RequirePermissions('automation.webhooks.write')
  createWebhook(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(user.tenantId, dto);
  }

  @Get('webhooks')
  @RequirePermissions('automation.webhooks.read')
  findWebhooks(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooksService.findAllForTenant(user.tenantId);
  }

  @Patch('webhooks/:id')
  @RequirePermissions('automation.webhooks.write')
  updateWebhook(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(user.tenantId, id, dto);
  }

  // --- Manual trigger ---
  @Post('process')
  @RequirePermissions('automation.rules.write')
  process(@CurrentUser() user: AuthenticatedUser) {
    return this.automationsService.process(user.tenantId);
  }

  // --- Reports (format=csv streams a download instead of JSON) ---
  @Get('reports/by-rep')
  @RequirePermissions('automation.reports.read')
  async byRep(@CurrentUser() user: AuthenticatedUser, @Query('format') format?: string) {
    const rows = await this.reportsService.byRep(user.tenantId);
    return format === 'csv' ? this.csvFile('reporte-por-vendedor', rows) : rows;
  }

  @Get('reports/by-client')
  @RequirePermissions('automation.reports.read')
  async byClient(@CurrentUser() user: AuthenticatedUser, @Query('format') format?: string) {
    const rows = await this.reportsService.byClient(user.tenantId);
    return format === 'csv' ? this.csvFile('reporte-por-cliente', rows) : rows;
  }

  @Get('reports/by-campaign')
  @RequirePermissions('automation.reports.read')
  async byCampaign(@CurrentUser() user: AuthenticatedUser, @Query('format') format?: string) {
    const rows = await this.reportsService.byCampaign(user.tenantId);
    return format === 'csv' ? this.csvFile('reporte-por-campana', rows) : rows;
  }

  @Get('reports/forecast')
  @RequirePermissions('automation.reports.read')
  async forecast(@CurrentUser() user: AuthenticatedUser, @Query('format') format?: string) {
    const rows = await this.reportsService.forecast(user.tenantId);
    return format === 'csv' ? this.csvFile('forecast', rows) : rows;
  }

  private csvFile<T extends object>(name: string, rows: T[]): StreamableFile {
    return new StreamableFile(Buffer.from(toCsv(rows as unknown as Array<Record<string, unknown>>), 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${name}.csv"`,
    });
  }
}
