import { apiClient } from './client';
import type { Equipment, Technician, MaintenanceWorkOrder, WorkOrderPart, WorkOrderType, WorkOrderPriority } from './types';

// --- Equipos ---

export interface CreateEquipmentPayload {
  name: string;
  code: string;
  category: string;
  location?: string;
  acquisitionDate?: string;
  notes?: string;
}

export interface UpdateEquipmentPayload {
  name?: string;
  category?: string;
  location?: string;
  status?: Equipment['status'];
  notes?: string;
}

export async function listEquipment(): Promise<Equipment[]> {
  const { data } = await apiClient.get('/maintenance/equipment');
  return data;
}

export async function createEquipment(payload: CreateEquipmentPayload): Promise<Equipment> {
  const { data } = await apiClient.post('/maintenance/equipment', payload);
  return data;
}

export async function updateEquipment(id: string, payload: UpdateEquipmentPayload): Promise<Equipment> {
  const { data } = await apiClient.patch(`/maintenance/equipment/${id}`, payload);
  return data;
}

export async function getEquipmentHistory(id: string): Promise<MaintenanceWorkOrder[]> {
  const { data } = await apiClient.get(`/maintenance/equipment/${id}/history`);
  return data;
}

// --- Técnicos ---

export interface CreateTechnicianPayload {
  name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  userId?: string;
}

export async function listTechnicians(): Promise<Technician[]> {
  const { data } = await apiClient.get('/maintenance/technicians');
  return data;
}

export async function createTechnician(payload: CreateTechnicianPayload): Promise<Technician> {
  const { data } = await apiClient.post('/maintenance/technicians', payload);
  return data;
}

export async function updateTechnician(id: string, payload: Partial<CreateTechnicianPayload> & { isActive?: boolean }): Promise<Technician> {
  const { data } = await apiClient.patch(`/maintenance/technicians/${id}`, payload);
  return data;
}

// --- Órdenes de trabajo ---

export interface CreateWorkOrderPayload {
  equipmentId: string;
  technicianId?: string;
  warehouseId: string;
  type: WorkOrderType;
  priority?: WorkOrderPriority;
  scheduledDate?: string;
  description: string;
  parts?: WorkOrderPart[];
}

export async function listWorkOrders(): Promise<MaintenanceWorkOrder[]> {
  const { data } = await apiClient.get('/maintenance/work-orders');
  return data;
}

export async function createWorkOrder(payload: CreateWorkOrderPayload): Promise<MaintenanceWorkOrder> {
  const { data } = await apiClient.post('/maintenance/work-orders', payload);
  return data;
}

export async function startWorkOrder(id: string): Promise<MaintenanceWorkOrder> {
  const { data } = await apiClient.patch(`/maintenance/work-orders/${id}/start`, {});
  return data;
}

export async function completeWorkOrder(id: string, resolutionNotes?: string): Promise<MaintenanceWorkOrder> {
  const { data } = await apiClient.patch(`/maintenance/work-orders/${id}/complete`, { resolutionNotes });
  return data;
}

export async function cancelWorkOrder(id: string): Promise<MaintenanceWorkOrder> {
  const { data } = await apiClient.patch(`/maintenance/work-orders/${id}/cancel`, {});
  return data;
}
