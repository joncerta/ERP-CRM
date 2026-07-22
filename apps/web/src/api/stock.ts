import { apiClient } from './client';
import type { StockBalance, StockMovement, StockMovementType } from './types';

export async function listStockBalances(): Promise<StockBalance[]> {
  const { data } = await apiClient.get('/inventory/stock/balances');
  return data;
}

export async function listStockMovements(): Promise<StockMovement[]> {
  const { data } = await apiClient.get('/inventory/stock/movements');
  return data;
}

export interface RecordMovementPayload {
  productId: string;
  warehouseId: string;
  type: Extract<StockMovementType, 'purchase' | 'sale' | 'adjustment'>;
  quantity: number;
  direction: 'in' | 'out';
  note?: string;
}

export async function recordMovement(payload: RecordMovementPayload): Promise<StockMovement> {
  const { data } = await apiClient.post('/inventory/stock/movements', payload);
  return data;
}

export interface TransferPayload {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  note?: string;
}

export async function transferStock(payload: TransferPayload): Promise<{ out: StockMovement; in: StockMovement }> {
  const { data } = await apiClient.post('/inventory/stock/transfers', payload);
  return data;
}
