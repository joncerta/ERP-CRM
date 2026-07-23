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
  employeeCount?: number | null;
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
  taxId: string | null;
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
  taxId: string | null;
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

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  debit: number | string;
  credit: number | string;
  description: string | null;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType: string;
  sourceId: string | null;
  createdByUserId: string;
  lines: JournalEntryLine[];
  createdAt: string;
}

export type CashAccountType = 'cash' | 'bank';

export interface CashAccount {
  id: string;
  name: string;
  type: CashAccountType;
  accountId: string;
  currencyCode: string;
  balance: number | string;
  isActive: boolean;
}

export type CashTransactionType = 'deposit' | 'withdrawal' | 'transfer';

export interface CashTransaction {
  id: string;
  cashAccountId: string;
  type: CashTransactionType;
  amount: number | string;
  note: string | null;
  transferGroupId: string | null;
  createdByUserId: string;
  occurredAt: string;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number | string;
  credit: number | string;
}

export interface BalanceSheetReport {
  assets: Array<{ code: string; name: string; balance: number }>;
  liabilities: Array<{ code: string; name: string; balance: number }>;
  equity: Array<{ code: string; name: string; balance: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface IncomeStatementReport {
  income: Array<{ code: string; name: string; amount: number }>;
  expenses: Array<{ code: string; name: string; amount: number }>;
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
}

export type FixedAssetStatus = 'active' | 'under_maintenance' | 'disposed';

export interface FixedAsset {
  id: string;
  assetNumber: string;
  name: string;
  description: string | null;
  purchaseDate: string;
  purchaseCost: number | string;
  usefulLifeMonths: number;
  salvageValue: number | string;
  accumulatedDepreciation: number | string;
  status: FixedAssetStatus;
  locationBranchId: string | null;
  responsibleUserId: string | null;
  lastDepreciatedPeriod: string | null;
  createdAt: string;
}

export type FixedAssetMovementType = 'maintenance' | 'transfer' | 'disposal';

export interface FixedAssetMovement {
  id: string;
  fixedAssetId: string;
  type: FixedAssetMovementType;
  date: string;
  note: string | null;
  cost: number | string | null;
  fromBranchId: string | null;
  toBranchId: string | null;
  createdByUserId: string;
}

export interface FixedAssetDepreciationEntry {
  id: string;
  fixedAssetId: string;
  period: string;
  amount: number | string;
  accumulatedAfter: number | string;
}

export interface Tax {
  id: string;
  name: string;
  rate: number | string;
  isDefault: boolean;
  isActive: boolean;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  contactId: string | null;
  companyId: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  accessToken: string;
  assignedToUserId: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorUserId: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  isPublished: boolean;
  viewCount: number;
  createdByUserId: string;
  createdAt: string;
}

export type CampaignChannel = 'email' | 'sms' | 'whatsapp';
export type CampaignStatus = 'draft' | 'sent' | 'cancelled';
export type CampaignRecipientStatus = 'pending' | 'sent' | 'simulated' | 'failed';

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  subject: string | null;
  content: string;
  sentAt: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  status: CampaignRecipientStatus;
  failureReason: string | null;
  sentAt: string | null;
}

export interface LandingForm {
  id: string;
  name: string;
  slug: string;
  campaignName: string | null;
  active: boolean;
  submissionCount: number;
  createdAt: string;
}

export interface NurtureStep {
  delayDays: number;
  subject: string;
  content: string;
}

export type NurtureEnrollmentStatus = 'active' | 'completed' | 'cancelled';

export interface NurtureSequence {
  id: string;
  name: string;
  active: boolean;
  steps: NurtureStep[];
  createdAt: string;
}

export interface NurtureEnrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  status: NurtureEnrollmentStatus;
  currentStep: number;
  nextStepDueAt: string | null;
  lastStepSentAt: string | null;
  createdAt: string;
}

export interface SegmentContact {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  company: { id: string; name: string; industry: string | null; city: string | null; employeeCount: number | null } | null;
}
