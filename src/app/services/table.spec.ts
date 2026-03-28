import { describe, it, expect } from 'vitest';

// --- Pure function replicas of TableService data mapping ---

interface RestaurantTable {
  id: string;
  merchantId: string;
  tableNumber: string;
  tableName: string | null;
  capacity: number;
  section: string | null;
  status: string;
  posX: number | null;
  posY: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function toModel(row: Record<string, unknown>): RestaurantTable {
  return {
    id: row['id'] as string,
    merchantId: row['restaurant_id'] as string,
    tableNumber: row['table_number'] as string,
    tableName: (row['table_name'] as string) ?? null,
    capacity: row['capacity'] as number,
    section: (row['section'] as string) ?? null,
    status: row['status'] as string,
    posX: (row['pos_x'] as number) ?? null,
    posY: (row['pos_y'] as number) ?? null,
    active: row['active'] as boolean,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function toRow(data: Partial<RestaurantTable>): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  if (data.merchantId !== undefined) map['restaurant_id'] = data.merchantId;
  if (data.tableNumber !== undefined) map['table_number'] = data.tableNumber;
  if (data.tableName !== undefined) map['table_name'] = data.tableName;
  if (data.capacity !== undefined) map['capacity'] = data.capacity;
  if (data.section !== undefined) map['section'] = data.section;
  if (data.status !== undefined) map['status'] = data.status;
  if (data.posX !== undefined) map['pos_x'] = data.posX;
  if (data.posY !== undefined) map['pos_y'] = data.posY;
  if (data.active !== undefined) map['active'] = data.active;
  return map;
}

// --- Tests ---

describe('TableService — toModel', () => {
  it('maps snake_case to camelCase', () => {
    const row = {
      id: 't-1',
      restaurant_id: 'r-1',
      table_number: '5',
      table_name: 'Window',
      capacity: 4,
      section: 'Main',
      status: 'available',
      pos_x: 100,
      pos_y: 200,
      active: true,
      created_at: '2026-01-01',
      updated_at: '2026-02-01',
    };
    const table = toModel(row);
    expect(table.id).toBe('t-1');
    expect(table.merchantId).toBe('r-1');
    expect(table.tableNumber).toBe('5');
    expect(table.tableName).toBe('Window');
    expect(table.capacity).toBe(4);
    expect(table.section).toBe('Main');
    expect(table.posX).toBe(100);
    expect(table.posY).toBe(200);
    expect(table.active).toBe(true);
  });

  it('defaults nulls for missing optional fields', () => {
    const row = {
      id: 't-1',
      restaurant_id: 'r-1',
      table_number: '1',
      capacity: 2,
      status: 'available',
      active: true,
      created_at: '2026-01-01',
      updated_at: '2026-02-01',
    };
    const table = toModel(row);
    expect(table.tableName).toBeNull();
    expect(table.section).toBeNull();
    expect(table.posX).toBeNull();
    expect(table.posY).toBeNull();
  });
});

describe('TableService — toRow', () => {
  it('maps camelCase to snake_case', () => {
    const row = toRow({
      tableNumber: '5',
      capacity: 6,
      section: 'Patio',
      posX: 50,
      posY: 75,
    });
    expect(row['table_number']).toBe('5');
    expect(row['capacity']).toBe(6);
    expect(row['section']).toBe('Patio');
    expect(row['pos_x']).toBe(50);
    expect(row['pos_y']).toBe(75);
  });

  it('omits undefined fields', () => {
    const row = toRow({ tableNumber: '1' });
    expect(Object.keys(row)).toEqual(['table_number']);
  });

  it('returns empty for empty input', () => {
    expect(toRow({})).toEqual({});
  });
});
