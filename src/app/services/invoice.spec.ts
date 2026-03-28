import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Invoice {
  id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amountDue: number;
  amountPaid: number;
}

interface HouseAccount {
  id: string;
  name: string;
  isActive: boolean;
}

// --- Pure function replicas ---

function activeHouseAccounts(accounts: HouseAccount[]): HouseAccount[] {
  return accounts.filter(a => a.isActive);
}

function overdueInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter(i => i.status === 'overdue');
}

function totalOutstanding(invoices: Invoice[]): number {
  return invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.amountDue, 0);
}

function totalCollected(invoices: Invoice[]): number {
  return invoices.reduce((sum, i) => sum + i.amountPaid, 0);
}

// List mutations
function prependInvoice(invoices: Invoice[], invoice: Invoice): Invoice[] {
  return [invoice, ...invoices];
}

function updateInvoiceInList(invoices: Invoice[], id: string, updated: Invoice): Invoice[] {
  return invoices.map(i => i.id === id ? updated : i);
}

function cancelInvoiceInList(invoices: Invoice[], id: string): Invoice[] {
  return invoices.map(i => i.id === id ? { ...i, status: 'cancelled' as const } : i);
}

// --- Tests ---

const invoices: Invoice[] = [
  { id: 'i-1', status: 'sent', amountDue: 500, amountPaid: 0 },
  { id: 'i-2', status: 'overdue', amountDue: 300, amountPaid: 0 },
  { id: 'i-3', status: 'paid', amountDue: 200, amountPaid: 200 },
  { id: 'i-4', status: 'cancelled', amountDue: 100, amountPaid: 0 },
];

describe('InvoiceService — activeHouseAccounts', () => {
  it('filters active accounts', () => {
    const accounts: HouseAccount[] = [
      { id: 'ha-1', name: 'Corp A', isActive: true },
      { id: 'ha-2', name: 'Corp B', isActive: false },
    ];
    expect(activeHouseAccounts(accounts)).toHaveLength(1);
  });
});

describe('InvoiceService — overdueInvoices', () => {
  it('returns only overdue', () => {
    expect(overdueInvoices(invoices)).toHaveLength(1);
    expect(overdueInvoices(invoices)[0].id).toBe('i-2');
  });
});

describe('InvoiceService — totalOutstanding', () => {
  it('sums amountDue excluding paid and cancelled', () => {
    // sent(500) + overdue(300) = 800
    expect(totalOutstanding(invoices)).toBe(800);
  });

  it('returns 0 for empty', () => {
    expect(totalOutstanding([])).toBe(0);
  });
});

describe('InvoiceService — totalCollected', () => {
  it('sums amountPaid across all invoices', () => {
    expect(totalCollected(invoices)).toBe(200);
  });
});

describe('InvoiceService — list mutations', () => {
  it('prependInvoice adds to beginning', () => {
    const newInv: Invoice = { id: 'i-5', status: 'draft', amountDue: 50, amountPaid: 0 };
    const result = prependInvoice(invoices, newInv);
    expect(result[0].id).toBe('i-5');
    expect(result).toHaveLength(5);
  });

  it('updateInvoiceInList replaces matching', () => {
    const updated: Invoice = { ...invoices[0], status: 'paid', amountPaid: 500 };
    const result = updateInvoiceInList(invoices, 'i-1', updated);
    expect(result[0].status).toBe('paid');
  });

  it('cancelInvoiceInList sets status to cancelled', () => {
    const result = cancelInvoiceInList(invoices, 'i-1');
    expect(result[0].status).toBe('cancelled');
  });
});
