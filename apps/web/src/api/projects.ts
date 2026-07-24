import { apiClient } from './client';
import type { Project, ProjectStatus, ProjectSummary, ProjectMilestone, ProjectResource, ProjectTimeEntry } from './types';

// --- Proyectos ---

export interface CreateProjectPayload {
  name: string;
  companyId?: string;
  leaderUserId: string;
  description?: string;
  budget?: number;
  currencyCode?: string;
  startDate: string;
  plannedEndDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  companyId?: string;
  leaderUserId?: string;
  description?: string;
  status?: ProjectStatus;
  budget?: number;
  plannedEndDate?: string;
  actualEndDate?: string;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get('/projects');
  return data;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await apiClient.post('/projects', payload);
  return data;
}

export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
  const { data } = await apiClient.patch(`/projects/${id}`, payload);
  return data;
}

export async function getProjectSummary(id: string): Promise<ProjectSummary> {
  const { data } = await apiClient.get(`/projects/${id}/summary`);
  return data;
}

// --- Hitos ---

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const { data } = await apiClient.get(`/projects/${projectId}/milestones`);
  return data;
}

export async function createMilestone(projectId: string, payload: { name: string; dueDate: string }): Promise<ProjectMilestone> {
  const { data } = await apiClient.post(`/projects/${projectId}/milestones`, payload);
  return data;
}

export async function completeMilestone(id: string): Promise<ProjectMilestone> {
  const { data } = await apiClient.patch(`/milestones/${id}/complete`, {});
  return data;
}

export async function delayMilestone(id: string, notes?: string): Promise<ProjectMilestone> {
  const { data } = await apiClient.patch(`/milestones/${id}/delay`, { notes });
  return data;
}

// --- Recursos asignados ---

export async function listResources(projectId: string): Promise<ProjectResource[]> {
  const { data } = await apiClient.get(`/projects/${projectId}/resources`);
  return data;
}

export async function assignResource(projectId: string, payload: { userId: string; roleLabel: string; hourlyRate?: number }): Promise<ProjectResource> {
  const { data } = await apiClient.post(`/projects/${projectId}/resources`, payload);
  return data;
}

// --- Registro de horas ---

export async function listTimeEntries(projectId: string): Promise<ProjectTimeEntry[]> {
  const { data } = await apiClient.get(`/projects/${projectId}/time-entries`);
  return data;
}

export async function logTimeEntry(
  projectId: string,
  payload: { resourceId: string; date: string; hours: number; description?: string },
): Promise<ProjectTimeEntry> {
  const { data } = await apiClient.post(`/projects/${projectId}/time-entries`, payload);
  return data;
}
