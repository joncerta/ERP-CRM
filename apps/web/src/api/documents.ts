import { apiClient } from './client';
import type { CrmDocument, DocumentCategory, CommunicationLogEntry, CommunicationChannel, CommunicationDirection } from './types';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface DocumentFilters {
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
}

export interface CreateDocumentPayload {
  name: string;
  category?: DocumentCategory;
  mimeType: string;
  fileData: string;
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
}

export async function listDocuments(filters: DocumentFilters = {}): Promise<CrmDocument[]> {
  const { data } = await apiClient.get('/documents', { params: filters });
  return data;
}

export async function uploadDocument(payload: CreateDocumentPayload): Promise<CrmDocument> {
  const { data } = await apiClient.post('/documents', payload);
  return data;
}

export async function updateDocument(id: string, payload: { name?: string; category?: DocumentCategory }): Promise<CrmDocument> {
  const { data } = await apiClient.patch(`/documents/${id}`, payload);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function downloadDocument(doc: CrmDocument): Promise<void> {
  const { data } = await apiClient.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
  triggerDownload(data, doc.name);
}

// --- Comunicaciones ---

export interface CreateCommunicationLogPayload {
  contactId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  summary: string;
  occurredAt?: string;
}

export async function logCommunication(payload: CreateCommunicationLogPayload): Promise<CommunicationLogEntry> {
  const { data } = await apiClient.post('/communications', payload);
  return data;
}

export async function listCommunicationsByContact(contactId: string): Promise<CommunicationLogEntry[]> {
  const { data } = await apiClient.get(`/communications/by-contact/${contactId}`);
  return data;
}
