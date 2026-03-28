import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Printer {
  id: string;
  name: string;
  isDefault: boolean;
  status: string;
}

// --- Pure function replicas ---

function addPrinterToList(printers: Printer[], newPrinter: Printer): Printer[] {
  let updated = [...printers, newPrinter];
  if (newPrinter.isDefault) {
    updated = updated.map(p =>
      p.id !== newPrinter.id ? { ...p, isDefault: false } : p
    );
  }
  return updated;
}

function updatePrinterInList(printers: Printer[], id: string, updated: Printer): Printer[] {
  let list = printers.map(p => p.id === id ? updated : p);
  if (updated.isDefault) {
    list = list.map(p =>
      p.id !== id ? { ...p, isDefault: false } : p
    );
  }
  return list;
}

function deletePrinterFromList(printers: Printer[], id: string): Printer[] {
  return printers.filter(p => p.id !== id);
}

// --- Tests ---

const printers: Printer[] = [
  { id: 'p-1', name: 'Kitchen', isDefault: true, status: 'online' },
  { id: 'p-2', name: 'Bar', isDefault: false, status: 'online' },
];

describe('PrinterService — addPrinterToList', () => {
  it('appends new printer', () => {
    const result = addPrinterToList(printers, { id: 'p-3', name: 'Receipt', isDefault: false, status: 'online' });
    expect(result).toHaveLength(3);
  });

  it('clears other defaults when new printer is default', () => {
    const result = addPrinterToList(printers, { id: 'p-3', name: 'New Default', isDefault: true, status: 'online' });
    expect(result).toHaveLength(3);
    expect(result.filter(p => p.isDefault)).toHaveLength(1);
    expect(result.find(p => p.isDefault)?.id).toBe('p-3');
  });

  it('preserves existing defaults when new printer is not default', () => {
    const result = addPrinterToList(printers, { id: 'p-3', name: 'New', isDefault: false, status: 'online' });
    expect(result.find(p => p.isDefault)?.id).toBe('p-1');
  });
});

describe('PrinterService — updatePrinterInList', () => {
  it('replaces matching printer', () => {
    const updated = { ...printers[1], name: 'Updated Bar' };
    const result = updatePrinterInList(printers, 'p-2', updated);
    expect(result[1].name).toBe('Updated Bar');
  });

  it('clears other defaults when updated printer becomes default', () => {
    const updated = { ...printers[1], isDefault: true };
    const result = updatePrinterInList(printers, 'p-2', updated);
    expect(result[0].isDefault).toBe(false);
    expect(result[1].isDefault).toBe(true);
  });
});

describe('PrinterService — deletePrinterFromList', () => {
  it('removes matching printer', () => {
    expect(deletePrinterFromList(printers, 'p-1')).toHaveLength(1);
  });

  it('returns same list for no match', () => {
    expect(deletePrinterFromList(printers, 'p-999')).toHaveLength(2);
  });
});
