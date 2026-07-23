import { apiClient } from './client';
import type { Activity } from './types';
import type { Paginated, PageParams } from './pagination';

export async function listActivities(
  filters: { contactId?: string; leadId?: string; opportunityId?: string } = {},
): Promise<Activity[]> {
  const { data } = await apiClient.get('/crm/activities', { params: filters });
  return data;
}

export async function listActivitiesPaginated(
  params: PageParams & { contactId?: string; leadId?: string; opportunityId?: string; ownerUserId?: string; type?: string },
): Promise<Paginated<Activity>> {
  const { data } = await apiClient.get('/crm/activities', { params });
  return data;
}

export async function getAgenda(onlyMine = false): Promise<Activity[]> {
  const { data } = await apiClient.get('/crm/activities/agenda', { params: { onlyMine: onlyMine ? 'true' : undefined } });
  return data;
}

export async function createActivity(payload: Partial<Activity>): Promise<Activity> {
  const { data } = await apiClient.post('/crm/activities', payload);
  return data;
}

export async function updateActivity(id: string, payload: Partial<Activity> & { completed?: boolean }): Promise<Activity> {
  const { data } = await apiClient.patch(`/crm/activities/${id}`, payload);
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  await apiClient.delete(`/crm/activities/${id}`);
}
