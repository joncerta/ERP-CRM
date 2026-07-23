import { apiClient } from './client';
import type { Opportunity, PipelineStage } from './types';

export async function listPipelineStages(): Promise<PipelineStage[]> {
  const { data } = await apiClient.get('/crm/pipeline-stages');
  return data;
}

export async function listOpportunities(): Promise<Opportunity[]> {
  const { data } = await apiClient.get('/crm/opportunities');
  return data;
}

export async function createOpportunity(payload: Partial<Opportunity>): Promise<Opportunity> {
  const { data } = await apiClient.post('/crm/opportunities', payload);
  return data;
}

export async function updateOpportunity(id: string, payload: Partial<Opportunity>): Promise<Opportunity> {
  const { data } = await apiClient.patch(`/crm/opportunities/${id}`, payload);
  return data;
}

export async function createOpportunityFromLead(
  leadId: string,
  payload: Partial<Opportunity> = {},
): Promise<Opportunity> {
  const { data } = await apiClient.post(`/crm/opportunities/from-lead/${leadId}`, payload);
  return data;
}

export async function moveOpportunityStage(id: string, stageId: string): Promise<Opportunity> {
  const { data } = await apiClient.patch(`/crm/opportunities/${id}/move-stage`, { stageId });
  return data;
}

export async function closeOpportunityLost(id: string, reason?: string): Promise<Opportunity> {
  const { data } = await apiClient.patch(`/crm/opportunities/${id}/close-lost`, { reason });
  return data;
}

export interface PipelineFunnel {
  stages: Array<{ stageId: string; stageName: string; count: number }>;
  won: number;
  lost: number;
  lostReasons: Array<{ reason: string; count: number }>;
}

export async function getPipelineFunnel(): Promise<PipelineFunnel> {
  const { data } = await apiClient.get('/crm/opportunities/funnel');
  return data;
}
