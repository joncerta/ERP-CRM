import { apiClient } from './client';
import type { BillOfMaterial, BomLine, ProductionOrder, ProductionOrderConsumption } from './types';

// --- Listas de materiales (BOM) ---

export interface CreateBomPayload {
  productId: string;
  name: string;
  outputQuantity?: number;
  notes?: string;
  lines: BomLine[];
}

export interface UpdateBomPayload {
  name?: string;
  isActive?: boolean;
  notes?: string;
  lines?: BomLine[];
}

export async function listBoms(productId?: string): Promise<BillOfMaterial[]> {
  const { data } = await apiClient.get('/production/boms', { params: productId ? { productId } : {} });
  return data;
}

export async function createBom(payload: CreateBomPayload): Promise<BillOfMaterial> {
  const { data } = await apiClient.post('/production/boms', payload);
  return data;
}

export async function updateBom(id: string, payload: UpdateBomPayload): Promise<BillOfMaterial> {
  const { data } = await apiClient.patch(`/production/boms/${id}`, payload);
  return data;
}

// --- Órdenes de producción ---

export interface CreateProductionOrderPayload {
  productId: string;
  bomId: string;
  warehouseId: string;
  quantityPlanned: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  notes?: string;
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  const { data } = await apiClient.get('/production/orders');
  return data;
}

export async function createProductionOrder(payload: CreateProductionOrderPayload): Promise<ProductionOrder> {
  const { data } = await apiClient.post('/production/orders', payload);
  return data;
}

export async function startProductionOrder(id: string): Promise<ProductionOrder> {
  const { data } = await apiClient.patch(`/production/orders/${id}/start`, {});
  return data;
}

export async function completeProductionOrder(id: string, quantityProduced: number): Promise<ProductionOrder> {
  const { data } = await apiClient.patch(`/production/orders/${id}/complete`, { quantityProduced });
  return data;
}

export async function cancelProductionOrder(id: string): Promise<ProductionOrder> {
  const { data } = await apiClient.patch(`/production/orders/${id}/cancel`, {});
  return data;
}

export async function listOrderConsumptions(id: string): Promise<ProductionOrderConsumption[]> {
  const { data } = await apiClient.get(`/production/orders/${id}/consumptions`);
  return data;
}
