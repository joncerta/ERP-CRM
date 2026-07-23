import { apiClient } from './client';
import type {
  AutomationRule,
  AutomationRuleType,
  WebhookSubscription,
  WebhookEventType,
  RepReportRow,
  ClientReportRow,
  CampaignReportRow,
  ForecastRow,
} from './types';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Reglas ---

export interface CreateAutomationRulePayload {
  name: string;
  type: AutomationRuleType;
  config?: Record<string, unknown>;
}

export async function listAutomationRules(): Promise<AutomationRule[]> {
  const { data } = await apiClient.get('/automations/rules');
  return data;
}

export async function createAutomationRule(payload: CreateAutomationRulePayload): Promise<AutomationRule> {
  const { data } = await apiClient.post('/automations/rules', payload);
  return data;
}

export async function updateAutomationRule(
  id: string,
  payload: Partial<CreateAutomationRulePayload> & { isActive?: boolean },
): Promise<AutomationRule> {
  const { data } = await apiClient.patch(`/automations/rules/${id}`, payload);
  return data;
}

// --- Webhooks ---

export interface CreateWebhookPayload {
  name: string;
  eventType: WebhookEventType;
  url: string;
}

export async function listWebhooks(): Promise<WebhookSubscription[]> {
  const { data } = await apiClient.get('/automations/webhooks');
  return data;
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<WebhookSubscription> {
  const { data } = await apiClient.post('/automations/webhooks', payload);
  return data;
}

export async function updateWebhook(
  id: string,
  payload: Partial<Pick<CreateWebhookPayload, 'name' | 'url'>> & { isActive?: boolean },
): Promise<WebhookSubscription> {
  const { data } = await apiClient.patch(`/automations/webhooks/${id}`, payload);
  return data;
}

// --- Disparador manual ---

export async function processAutomations(): Promise<{ overdueInvoices: number; staleLeadReminders: number }> {
  const { data } = await apiClient.post('/automations/process');
  return data;
}

// --- Reportes ---

export async function reportByRep(): Promise<RepReportRow[]> {
  const { data } = await apiClient.get('/automations/reports/by-rep');
  return data;
}

export async function reportByClient(): Promise<ClientReportRow[]> {
  const { data } = await apiClient.get('/automations/reports/by-client');
  return data;
}

export async function reportByCampaign(): Promise<CampaignReportRow[]> {
  const { data } = await apiClient.get('/automations/reports/by-campaign');
  return data;
}

export async function reportForecast(): Promise<ForecastRow[]> {
  const { data } = await apiClient.get('/automations/reports/forecast');
  return data;
}

const REPORT_FILENAMES: Record<'by-rep' | 'by-client' | 'by-campaign' | 'forecast', string> = {
  'by-rep': 'reporte-por-vendedor.csv',
  'by-client': 'reporte-por-cliente.csv',
  'by-campaign': 'reporte-por-campana.csv',
  forecast: 'forecast.csv',
};

export async function downloadReportCsv(report: 'by-rep' | 'by-client' | 'by-campaign' | 'forecast'): Promise<void> {
  const { data } = await apiClient.get(`/automations/reports/${report}`, { params: { format: 'csv' }, responseType: 'blob' });
  triggerDownload(data, REPORT_FILENAMES[report]);
}
