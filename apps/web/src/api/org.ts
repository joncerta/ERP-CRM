import { apiClient } from './client';
import type { Paginated, PageParams } from './pagination';

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  timezone: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  branchId: string | null;
  costCenterId: string | null;
  isActive: boolean;
}

export interface Position {
  id: string;
  name: string;
  departmentId: string | null;
  isActive: boolean;
}

export interface DocumentSeries {
  id: string;
  documentType: string;
  branchId: string | null;
  prefix: string;
  nextNumber: number;
  padding: number;
  isActive: boolean;
}

function crud<T>(path: string) {
  return {
    list: async (): Promise<T[]> => (await apiClient.get(path)).data,
    listPaginated: async (params: PageParams): Promise<Paginated<T>> => (await apiClient.get(path, { params })).data,
    create: async (payload: Partial<T>): Promise<T> => (await apiClient.post(path, payload)).data,
    update: async (id: string, payload: Partial<T>): Promise<T> => (await apiClient.patch(`${path}/${id}`, payload)).data,
    remove: async (id: string): Promise<void> => {
      await apiClient.delete(`${path}/${id}`);
    },
  };
}

export const branchesApi = crud<Branch>('/org/branches');
export const costCentersApi = crud<CostCenter>('/org/cost-centers');
export const departmentsApi = crud<Department>('/org/departments');
export const positionsApi = crud<Position>('/org/positions');
export const documentSeriesApi = crud<DocumentSeries>('/org/document-series');

export interface AssignUserOrgPayload {
  managerId?: string;
  branchId?: string;
  departmentId?: string;
  positionId?: string;
}

export async function assignUserOrg(userId: string, payload: AssignUserOrgPayload): Promise<void> {
  await apiClient.patch(`/users/${userId}/org`, payload);
}
