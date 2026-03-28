export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  merchantId: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  companyName: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  depositRequired: number;
  depositPaid: number;
  amountPaid: number;
  amountDue: number;
  status: InvoiceStatus;
  notes: string | null;
  dueDate: string;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  paymentLink: string | null;
  linkedOrderId: string | null;
  isHouseAccount: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFormData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  lineItems: Omit<InvoiceLineItem, 'id'>[];
  taxRate: number;
  depositRequired?: number;
  notes?: string;
  dueDate: string;
  linkedOrderId?: string;
  isHouseAccount?: boolean;
}

export interface HouseAccount {
  id: string;
  merchantId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  billingCycle: 'weekly' | 'biweekly' | 'monthly';
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface HouseAccountFormData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  billingCycle: 'weekly' | 'biweekly' | 'monthly';
  creditLimit: number;
}

export type InvoiceTab = 'invoices' | 'house-accounts';
