import { apiClient } from './client';
import type {
  QualityInspection,
  InspectionType,
  InspectionResult,
  QualityAudit,
  AuditType,
  NonConformity,
  Severity,
  ActionStatus,
  QualityIndicators,
} from './types';

// --- Inspecciones ---

export interface CreateInspectionPayload {
  type: InspectionType;
  subject: string;
  relatedProductionOrderId?: string;
  relatedEquipmentId?: string;
  inspectorUserId?: string;
  inspectionDate: string;
  result: InspectionResult;
  notes?: string;
}

export async function listInspections(): Promise<QualityInspection[]> {
  const { data } = await apiClient.get('/quality/inspections');
  return data;
}

export async function createInspection(payload: CreateInspectionPayload): Promise<QualityInspection> {
  const { data } = await apiClient.post('/quality/inspections', payload);
  return data;
}

export async function updateInspection(id: string, payload: Partial<CreateInspectionPayload>): Promise<QualityInspection> {
  const { data } = await apiClient.patch(`/quality/inspections/${id}`, payload);
  return data;
}

// --- Auditorías ---

export interface CreateAuditPayload {
  type: AuditType;
  scope: string;
  auditor: string;
  scheduledDate: string;
}

export async function listAudits(): Promise<QualityAudit[]> {
  const { data } = await apiClient.get('/quality/audits');
  return data;
}

export async function createAudit(payload: CreateAuditPayload): Promise<QualityAudit> {
  const { data } = await apiClient.post('/quality/audits', payload);
  return data;
}

export async function completeAudit(id: string, findings: string): Promise<QualityAudit> {
  const { data } = await apiClient.patch(`/quality/audits/${id}/complete`, { findings });
  return data;
}

export async function cancelAudit(id: string): Promise<QualityAudit> {
  const { data } = await apiClient.patch(`/quality/audits/${id}/cancel`, {});
  return data;
}

// --- No conformidades ---

export interface CorrectiveActionInput {
  description: string;
  responsibleUserId?: string;
  dueDate?: string;
}

export interface CreateNonConformityPayload {
  description: string;
  severity: Severity;
  detectedDate: string;
  inspectionId?: string;
  auditId?: string;
  actions?: CorrectiveActionInput[];
}

export async function listNonConformities(): Promise<NonConformity[]> {
  const { data } = await apiClient.get('/quality/non-conformities');
  return data;
}

export async function createNonConformity(payload: CreateNonConformityPayload): Promise<NonConformity> {
  const { data } = await apiClient.post('/quality/non-conformities', payload);
  return data;
}

export async function closeNonConformity(id: string): Promise<NonConformity> {
  const { data } = await apiClient.patch(`/quality/non-conformities/${id}/close`, {});
  return data;
}

export async function updateAction(
  nonConformityId: string,
  actionId: string,
  payload: { status?: ActionStatus; completionNotes?: string },
): Promise<NonConformity> {
  const { data } = await apiClient.patch(`/quality/non-conformities/${nonConformityId}/actions/${actionId}`, payload);
  return data;
}

// --- Indicadores ---

export async function getIndicators(): Promise<QualityIndicators> {
  const { data } = await apiClient.get('/quality/indicators');
  return data;
}
