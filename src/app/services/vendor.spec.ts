import { describe, it, expect } from 'vitest';

// --- Interfaces ---

type PurchaseInvoiceStatus = 'pending_review' | 'approved' | 'paid' | 'rejected';
type PurchaseOrderStatus = 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';

interface Vendor {
  id: string;
  name: string;
  isActive: boolean;
}

interface PurchaseInvoice {
  id: string;
  vendorId: string;
  status: PurchaseInvoiceStatus;
  total: number;
}

interface PurchaseOrder {
  id: string;
  vendorId: string;
  status: PurchaseOrderStatus;
}

// --- Pure function replicas ---

function activeVendors(vendors: Vendor[]): Vendor[] {
  return vendors.filter(v => v.isActive);
}

function invoicesByStatus(invoices: PurchaseInvoice[]): Map<PurchaseInvoiceStatus, PurchaseInvoice[]> {
  const map = new Map<PurchaseInvoiceStatus, PurchaseInvoice[]>();
  for (const inv of invoices) {
    const list = map.get(inv.status) ?? [];
    list.push(inv);
    map.set(inv.status, list);
  }
  return map;
}

function pendingInvoiceCount(invoices: PurchaseInvoice[]): number {
  return invoices.filter(i => i.status === 'pending_review').length;
}

function purchaseOrdersByStatus(orders: PurchaseOrder[]): Map<PurchaseOrderStatus, PurchaseOrder[]> {
  const map = new Map<PurchaseOrderStatus, PurchaseOrder[]>();
  for (const po of orders) {
    const list = map.get(po.status) ?? [];
    list.push(po);
    map.set(po.status, list);
  }
  return map;
}

function draftPOCount(orders: PurchaseOrder[]): number {
  return orders.filter(po => po.status === 'draft').length;
}

function openPOCount(orders: PurchaseOrder[]): number {
  return orders.filter(po => po.status === 'submitted' || po.status === 'partially_received').length;
}

// List mutations
function addVendor(vendors: Vendor[], vendor: Vendor): Vendor[] {
  return [...vendors, vendor];
}

function updateVendorInList(vendors: Vendor[], id: string, updated: Vendor): Vendor[] {
  return vendors.map(v => v.id === id ? updated : v);
}

function deleteVendorFromList(vendors: Vendor[], id: string): Vendor[] {
  return vendors.filter(v => v.id !== id);
}

function prependInvoice(invoices: PurchaseInvoice[], invoice: PurchaseInvoice): PurchaseInvoice[] {
  return [invoice, ...invoices];
}

// --- Tests ---

const vendors: Vendor[] = [
  { id: 'v-1', name: 'Sysco', isActive: true },
  { id: 'v-2', name: 'US Foods', isActive: true },
  { id: 'v-3', name: 'Old Vendor', isActive: false },
];

const invoices: PurchaseInvoice[] = [
  { id: 'inv-1', vendorId: 'v-1', status: 'pending_review', total: 500 },
  { id: 'inv-2', vendorId: 'v-1', status: 'approved', total: 300 },
  { id: 'inv-3', vendorId: 'v-2', status: 'pending_review', total: 750 },
  { id: 'inv-4', vendorId: 'v-2', status: 'paid', total: 200 },
];

const purchaseOrders: PurchaseOrder[] = [
  { id: 'po-1', vendorId: 'v-1', status: 'draft' },
  { id: 'po-2', vendorId: 'v-1', status: 'submitted' },
  { id: 'po-3', vendorId: 'v-2', status: 'partially_received' },
  { id: 'po-4', vendorId: 'v-2', status: 'received' },
  { id: 'po-5', vendorId: 'v-1', status: 'draft' },
];

describe('VendorService — activeVendors', () => {
  it('filters active vendors', () => {
    expect(activeVendors(vendors)).toHaveLength(2);
  });

  it('returns empty for empty list', () => {
    expect(activeVendors([])).toHaveLength(0);
  });
});

describe('VendorService — invoicesByStatus', () => {
  it('groups invoices by status', () => {
    const grouped = invoicesByStatus(invoices);
    expect(grouped.get('pending_review')).toHaveLength(2);
    expect(grouped.get('approved')).toHaveLength(1);
    expect(grouped.get('paid')).toHaveLength(1);
  });
});

describe('VendorService — pendingInvoiceCount', () => {
  it('counts pending_review invoices', () => {
    expect(pendingInvoiceCount(invoices)).toBe(2);
  });

  it('returns 0 when none pending', () => {
    expect(pendingInvoiceCount([invoices[1]])).toBe(0);
  });
});

describe('VendorService — purchaseOrdersByStatus', () => {
  it('groups POs by status', () => {
    const grouped = purchaseOrdersByStatus(purchaseOrders);
    expect(grouped.get('draft')).toHaveLength(2);
    expect(grouped.get('submitted')).toHaveLength(1);
    expect(grouped.get('partially_received')).toHaveLength(1);
    expect(grouped.get('received')).toHaveLength(1);
  });
});

describe('VendorService — draftPOCount / openPOCount', () => {
  it('counts draft POs', () => {
    expect(draftPOCount(purchaseOrders)).toBe(2);
  });

  it('counts open POs (submitted + partially_received)', () => {
    expect(openPOCount(purchaseOrders)).toBe(2);
  });

  it('returns 0 for empty', () => {
    expect(draftPOCount([])).toBe(0);
    expect(openPOCount([])).toBe(0);
  });
});

describe('VendorService — list mutations', () => {
  it('addVendor appends', () => {
    expect(addVendor(vendors, { id: 'v-4', name: 'New', isActive: true })).toHaveLength(4);
  });

  it('updateVendorInList replaces matching', () => {
    const updated = { ...vendors[0], name: 'Sysco Updated' };
    expect(updateVendorInList(vendors, 'v-1', updated)[0].name).toBe('Sysco Updated');
  });

  it('deleteVendorFromList removes matching', () => {
    expect(deleteVendorFromList(vendors, 'v-3')).toHaveLength(2);
  });

  it('prependInvoice adds to beginning', () => {
    const newInv: PurchaseInvoice = { id: 'inv-5', vendorId: 'v-1', status: 'pending_review', total: 100 };
    const result = prependInvoice(invoices, newInv);
    expect(result[0].id).toBe('inv-5');
    expect(result).toHaveLength(5);
  });
});
