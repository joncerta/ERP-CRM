import { apiClient } from './client';
import type {
  Campaign,
  CampaignChannel,
  CampaignRecipient,
  LandingForm,
  NurtureEnrollment,
  NurtureSequence,
  NurtureStep,
  SegmentContact,
} from './types';
import type { Paginated, PageParams } from './pagination';

// --- Campañas ---

export interface CreateCampaignPayload {
  name: string;
  channel: CampaignChannel;
  subject?: string;
  content: string;
}

export async function listCampaignsPaginated(params: PageParams): Promise<Paginated<Campaign>> {
  const { data } = await apiClient.get('/marketing/campaigns', { params });
  return data;
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.get(`/marketing/campaigns/${id}`);
  return data;
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post('/marketing/campaigns', payload);
  return data;
}

export async function updateCampaign(id: string, payload: Partial<CreateCampaignPayload>): Promise<Campaign> {
  const { data } = await apiClient.patch(`/marketing/campaigns/${id}`, payload);
  return data;
}

export async function cancelCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.patch(`/marketing/campaigns/${id}/cancel`);
  return data;
}

export async function sendCampaign(id: string, contactIds: string[]): Promise<Campaign> {
  const { data } = await apiClient.post(`/marketing/campaigns/${id}/send`, { contactIds });
  return data;
}

export async function listCampaignRecipients(id: string): Promise<CampaignRecipient[]> {
  const { data } = await apiClient.get(`/marketing/campaigns/${id}/recipients`);
  return data;
}

// --- Formularios de captura (landing pages) ---

export interface CreateLandingFormPayload {
  name: string;
  campaignName?: string;
}

export async function listLandingForms(): Promise<LandingForm[]> {
  const { data } = await apiClient.get('/marketing/landing-forms');
  return data;
}

export async function createLandingForm(payload: CreateLandingFormPayload): Promise<LandingForm> {
  const { data } = await apiClient.post('/marketing/landing-forms', payload);
  return data;
}

export async function updateLandingForm(
  id: string,
  payload: Partial<CreateLandingFormPayload> & { active?: boolean },
): Promise<LandingForm> {
  const { data } = await apiClient.patch(`/marketing/landing-forms/${id}`, payload);
  return data;
}

export async function submitPublicLandingForm(
  tenantSlug: string,
  formSlug: string,
  payload: { name: string; email?: string; phone?: string; companyName?: string; message?: string },
): Promise<void> {
  await apiClient.post(`/public/marketing/${tenantSlug}/forms/${formSlug}`, payload);
}

// --- Secuencias de nutrición ---

export interface CreateNurtureSequencePayload {
  name: string;
  steps: NurtureStep[];
}

export async function listNurtureSequences(): Promise<NurtureSequence[]> {
  const { data } = await apiClient.get('/marketing/nurture-sequences');
  return data;
}

export async function createNurtureSequence(payload: CreateNurtureSequencePayload): Promise<NurtureSequence> {
  const { data } = await apiClient.post('/marketing/nurture-sequences', payload);
  return data;
}

export async function updateNurtureSequence(
  id: string,
  payload: Partial<CreateNurtureSequencePayload> & { active?: boolean },
): Promise<NurtureSequence> {
  const { data } = await apiClient.patch(`/marketing/nurture-sequences/${id}`, payload);
  return data;
}

export async function enrollContactsInSequence(id: string, contactIds: string[]): Promise<NurtureEnrollment[]> {
  const { data } = await apiClient.post(`/marketing/nurture-sequences/${id}/enroll`, { contactIds });
  return data;
}

export async function listSequenceEnrollments(id: string): Promise<NurtureEnrollment[]> {
  const { data } = await apiClient.get(`/marketing/nurture-sequences/${id}/enrollments`);
  return data;
}

export async function cancelEnrollment(enrollmentId: string): Promise<NurtureEnrollment> {
  const { data } = await apiClient.patch(`/marketing/nurture-sequences/enrollments/${enrollmentId}/cancel`);
  return data;
}

export async function processNurtureSequences(): Promise<{ processed: number; sent: number; completed: number }> {
  const { data } = await apiClient.post('/marketing/nurture-sequences/process');
  return data;
}

// --- Segmentación ---

export interface SegmentQuery {
  industry?: string;
  city?: string;
  position?: string;
  minEmployees?: number;
  maxEmployees?: number;
}

export async function querySegmentContacts(params: SegmentQuery): Promise<{ items: SegmentContact[]; total: number }> {
  const { data } = await apiClient.get('/marketing/segments/contacts', { params });
  return data;
}
