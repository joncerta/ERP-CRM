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
  interest?: string | null;
  estimatedBudget?: number | string | null;
  status: LeadStatus;
  priority: LeadPriority;
  ownerUserId: string | null;
  createdAt: string;
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
