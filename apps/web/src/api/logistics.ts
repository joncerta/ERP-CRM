import { apiClient } from './client';
import type { Vehicle, Driver, DeliveryNote, DeliveryNoteItem } from './types';

// --- Vehículos ---

export interface CreateVehiclePayload {
  plate: string;
  brand: string;
  model: string;
  capacityKg?: number;
  notes?: string;
}

export interface UpdateVehiclePayload {
  brand?: string;
  model?: string;
  capacityKg?: number;
  status?: Vehicle['status'];
  notes?: string;
}

export async function listVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get('/logistics/vehicles');
  return data;
}

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  const { data } = await apiClient.post('/logistics/vehicles', payload);
  return data;
}

export async function updateVehicle(id: string, payload: UpdateVehiclePayload): Promise<Vehicle> {
  const { data } = await apiClient.patch(`/logistics/vehicles/${id}`, payload);
  return data;
}

export async function getVehicleDeliveries(id: string): Promise<DeliveryNote[]> {
  const { data } = await apiClient.get(`/logistics/vehicles/${id}/deliveries`);
  return data;
}

// --- Conductores ---

export interface CreateDriverPayload {
  name: string;
  licenseNumber?: string;
  phone?: string;
  userId?: string;
}

export async function listDrivers(): Promise<Driver[]> {
  const { data } = await apiClient.get('/logistics/drivers');
  return data;
}

export async function createDriver(payload: CreateDriverPayload): Promise<Driver> {
  const { data } = await apiClient.post('/logistics/drivers', payload);
  return data;
}

export async function updateDriver(id: string, payload: Partial<CreateDriverPayload> & { isActive?: boolean }): Promise<Driver> {
  const { data } = await apiClient.patch(`/logistics/drivers/${id}`, payload);
  return data;
}

// --- Guías de entrega ---

export interface CreateDeliveryNotePayload {
  vehicleId: string;
  driverId: string;
  warehouseId: string;
  relatedInvoiceId?: string;
  destinationAddress: string;
  notes?: string;
  items: DeliveryNoteItem[];
}

export async function listDeliveryNotes(): Promise<DeliveryNote[]> {
  const { data } = await apiClient.get('/logistics/delivery-notes');
  return data;
}

export async function createDeliveryNote(payload: CreateDeliveryNotePayload): Promise<DeliveryNote> {
  const { data } = await apiClient.post('/logistics/delivery-notes', payload);
  return data;
}

export async function dispatchDeliveryNote(id: string): Promise<DeliveryNote> {
  const { data } = await apiClient.patch(`/logistics/delivery-notes/${id}/dispatch`, {});
  return data;
}

export async function deliverDeliveryNote(id: string, recipientName?: string): Promise<DeliveryNote> {
  const { data } = await apiClient.patch(`/logistics/delivery-notes/${id}/deliver`, { recipientName });
  return data;
}

export async function cancelDeliveryNote(id: string): Promise<DeliveryNote> {
  const { data } = await apiClient.patch(`/logistics/delivery-notes/${id}/cancel`, {});
  return data;
}
