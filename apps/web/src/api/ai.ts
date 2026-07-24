import { apiClient } from './client';
import type { DraftType, SummaryType } from './types';

export interface DraftPayload {
  type: DraftType;
  contextId: string;
  instructions?: string;
}

export async function requestDraft(payload: DraftPayload): Promise<{ draft: string }> {
  const { data } = await apiClient.post('/ai/draft', payload);
  return data;
}

export interface SummarizePayload {
  type: SummaryType;
  contextId?: string;
}

export async function requestSummary(payload: SummarizePayload): Promise<{ summary: string }> {
  const { data } = await apiClient.post('/ai/summarize', payload);
  return data;
}

export async function requestLeadScore(leadId: string): Promise<{ leadId: string; priority: string; reasoning: string }> {
  const { data } = await apiClient.post('/ai/lead-score', { leadId });
  return data;
}

export async function askAssistant(question: string): Promise<{ answer: string }> {
  const { data } = await apiClient.post('/ai/assistant', { question });
  return data;
}
