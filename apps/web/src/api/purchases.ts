import { apiClient } from './client';
import type { PurchaseOrder, PurchaseOrderItem, Supplier, SupplierInvoice, SupplierPayment } from './types';
import type { Paginated, PageParams } from './pagination';

export interface CreateSupplierPayload {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await apiClient.get('/finance/suppliers');
  return data;
}

export async function listSuppliersPaginated(params: PageParams): Promise<Paginated<Supplier>> {
  const { data } = await apiClient.get('/finance/suppliers', { params });
  return data;
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data } = await apiClient.get(`/finance/suppliers/${id}`);
  return data;
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
  const { data } = await apiClient.post('/finance/suppliers', payload);
  return data;
}

export async function updateSupplier(
  id: string,
  payload: Partial<CreateSupplierPayload> & { isActive?: boolean },
): Promise<Supplier> {
  const { data } = await apiClient.patch(`/finance/suppliers/${id}`, payload);
  return data;
}

export interface PurchaseOrderItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  currencyCode?: string;
  expectedDate?: string;
  items: PurchaseOrderItemInput[];
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data } = await apiClient.get('/finance/purchase-orders');
  return data;
}

export async function listPurchaseOrdersPaginated(
  params: PageParams & { status?: string; ownerUserId?: string; supplierId?: string },
): Promise<Paginated<PurchaseOrder>> {
  const { data } = await apiClient.get('/finance/purchase-orders', { params });
  return data;
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.get(`/finance/purchase-orders/${id}`);
  return data;
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const { data } = await apiClient.post('/finance/purchase-orders', payload);
  return data;
}

export async function updatePurchaseOrder(id: string, payload: Partial<CreatePurchaseOrderPayload>): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch(`/finance/purchase-orders/${id}`, payload);
  return data;
}

export async function sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch(`/finance/purchase-orders/${id}/send`);
  return data;
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch(`/finance/purchase-orders/${id}/cancel`);
  return data;
}

export interface ReceiveLineInput {
  itemId: string;
  quantity: number;
  warehouseId: string;
}

export async function receivePurchaseOrder(id: string, lines: ReceiveLineInput[]): Promise<PurchaseOrder> {
  const { data } = await apiClient.post(`/finance/purchase-orders/${id}/receive`, { lines });
  return data;
}

export interface CreateSupplierInvoicePayload {
  supplierId: string;
  purchaseOrderId?: string;
  supplierInvoiceNumber: string;
  currencyCode?: string;
  amount: number;
  issueDate: string;
  dueDate?: string;
}

export async function listSupplierInvoices(): Promise<SupplierInvoice[]> {
  const { data } = await apiClient.get('/finance/supplier-invoices');
  return data;
}

export async function listSupplierInvoicesPaginated(
  params: PageParams & { status?: string; ownerUserId?: string; supplierId?: string },
): Promise<Paginated<SupplierInvoice>> {
  const { data } = await apiClient.get('/finance/supplier-invoices', { params });
  return data;
}

export async function getSupplierInvoice(id: string): Promise<SupplierInvoice> {
  const { data } = await apiClient.get(`/finance/supplier-invoices/${id}`);
  return data;
}

export async function createSupplierInvoice(payload: CreateSupplierInvoicePayload): Promise<SupplierInvoice> {
  const { data } = await apiClient.post('/finance/supplier-invoices', payload);
  return data;
}

export async function cancelSupplierInvoice(id: string): Promise<SupplierInvoice> {
  const { data } = await apiClient.patch(`/finance/supplier-invoices/${id}/cancel`);
  return data;
}

export async function addSupplierPayment(
  id: string,
  payload: { amount: number; method?: string; paidAt?: string; note?: string },
): Promise<SupplierPayment> {
  const { data } = await apiClient.post(`/finance/supplier-invoices/${id}/payments`, payload);
  return data;
}

export async function listSupplierPayments(id: string): Promise<SupplierPayment[]> {
  const { data } = await apiClient.get(`/finance/supplier-invoices/${id}/payments`);
  return data;
}

export type { PurchaseOrderItem };
