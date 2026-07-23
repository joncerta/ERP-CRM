export interface Company {
  id: string;
  name: string;
  taxId?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface Contact {
  id: string;
  companyId: string | null;
  firstName: string;
  lastName?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';
export type LeadPriority = 'low' | 'medium' | 'high';

export interface Lead {
  id: string;
  name: string;
  companyId: string | null;
  contactId: string | null;
  source?: string | null;
  campaign?: string | null;
  interest?: string | null;
  estimatedBudget?: number | string | null;
  status: LeadStatus;
  priority: LeadPriority;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

export type OpportunityStatus = 'open' | 'won' | 'lost';

export interface Opportunity {
  id: string;
  name: string;
  leadId: string | null;
  companyId: string | null;
  contactId: string | null;
  stageId: string;
  value: number | string;
  currencyCode: string;
  probability: number;
  expectedCloseDate: string | null;
  status: OpportunityStatus;
  lostReason?: string | null;
  ownerUserId: string | null;
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  opportunityId: string | null;
  companyId: string;
  contactId: string | null;
  status: QuoteStatus;
  currencyCode: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  viewCount: number;
  respondedAt: string | null;
  accessToken: string;
  ownerUserId: string;
  version: number;
  previousVersionId: string | null;
  items: QuoteItem[];
}

export type QuoteFollowUpStatus = 'pending' | 'done';

export interface QuoteFollowUp {
  id: string;
  quoteId: string;
  dueAt: string;
  note?: string | null;
  status: QuoteFollowUpStatus;
  completedAt: string | null;
  assignedToUserId: string;
}

export interface PendingFollowUp {
  id: string;
  quoteId: string;
  dueAt: string;
  note: string | null;
  status: QuoteFollowUpStatus;
  assignedToUserId: string;
  quoteNumber: string;
  quoteStatus: QuoteStatus | 'unknown';
  companyId: string;
  companyName: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  unitId: string;
  categoryId?: string | null;
  warehouseId: string;
  costPrice: number | string;
  salePrice: number | string;
  minStock: number | string | null;
  isActive: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductUnit {
  id: string;
  name: string;
}

export interface StockBalance {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number | string;
}

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'transfer';

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantityDelta: number | string;
  note: string | null;
  transferGroupId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'note' | 'visit' | 'task';

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  notes: string | null;
  contactId: string | null;
  leadId: string | null;
  opportunityId: string | null;
  ownerUserId: string;
  scheduledAt: string | null;
  completedAt: string | null;
  outcome: string | null;
  nextAction: string | null;
  createdAt: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  contactId: string | null;
  quoteId: string | null;
  status: InvoiceStatus;
  currencyCode: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  adjustmentsTotal: number | string;
  amountPaid: number | string;
  issueDate: string;
  dueDate: string | null;
  reminderCount: number;
  ownerUserId: string;
  items: InvoiceItem[];
  createdAt: string;
}

export type InvoiceAdjustmentType = 'credit' | 'debit';

export interface InvoiceAdjustment {
  id: string;
  invoiceId: string;
  type: InvoiceAdjustmentType;
  amount: number | string;
  reason: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number | string;
  method: string | null;
  paidAt: string;
  note: string | null;
  createdByUserId: string;
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoiceItemTemplate {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface RecurringInvoiceTemplate {
  id: string;
  name: string;
  companyId: string;
  contactId: string | null;
  currencyCode: string;
  frequency: RecurrenceFrequency;
  items: RecurringInvoiceItemTemplate[];
  taxRate: number | string;
  ownerUserId: string;
  isActive: boolean;
  lastGeneratedAt: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: number | string;
  quantityReceived: number | string;
  unitCost: number | string;
  total: number | string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  currencyCode: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  expectedDate: string | null;
  ownerUserId: string;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export type SupplierInvoiceStatus = 'pending' | 'partially_paid' | 'paid' | 'cancelled';

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  purchaseOrderId: string | null;
  supplierInvoiceNumber: string;
  currencyCode: string;
  amount: number | string;
  amountPaid: number | string;
  status: SupplierInvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  ownerUserId: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierInvoiceId: string;
  amount: number | string;
  method: string | null;
  paidAt: string;
  note: string | null;
  createdByUserId: string;
}
