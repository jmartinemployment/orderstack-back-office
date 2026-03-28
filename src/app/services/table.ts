import { Injectable, inject, signal } from '@angular/core';
import { RestaurantTable, TableFormData } from '../models';
import { AuthService } from './auth';
import { supabase } from './supabase';

const TABLE = 'restaurant_tables';

function toModel(row: Record<string, unknown>): RestaurantTable {
  return {
    id: row['id'] as string,
    merchantId: row['restaurant_id'] as string,
    tableNumber: row['table_number'] as string,
    tableName: (row['table_name'] as string) ?? null,
    capacity: row['capacity'] as number,
    section: (row['section'] as string) ?? null,
    status: row['status'] as string,
    serverName: (row['server_name'] as string) ?? null,
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
  if (data.serverName !== undefined) map['server_name'] = data.serverName;
  if (data.posX !== undefined) map['pos_x'] = data.posX;
  if (data.posY !== undefined) map['pos_y'] = data.posY;
  if (data.active !== undefined) map['active'] = data.active;
  return map;
}

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private readonly authService = inject(AuthService);

  private readonly _tables = signal<RestaurantTable[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly tables = this._tables.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  async loadTables(): Promise<void> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected — cannot load tables');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    const { data, error } = await supabase()
      .from(TABLE)
      .select('*')
      .eq('restaurant_id', this.merchantId)
      .eq('active', true)
      .order('table_number');

    if (error) {
      this._error.set(error.message);
      this._tables.set([]);
    } else {
      this._tables.set((data ?? []).map(toModel));
    }
    this._isLoading.set(false);
  }

  async createTable(data: TableFormData): Promise<RestaurantTable | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected — cannot create table');
      return null;
    }
    this._error.set(null);

    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      restaurant_id: this.merchantId,
      table_number: data.tableNumber,
      table_name: data.tableName ?? null,
      capacity: data.capacity,
      section: data.section ?? null,
      status: 'available',
      pos_x: data.posX ?? null,
      pos_y: data.posY ?? null,
      active: true,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error } = await supabase()
      .from(TABLE)
      .insert(row)
      .select()
      .single();

    if (error) {
      this._error.set(error.message);
      return null;
    }

    const table = toModel(inserted);
    this._tables.update(tables => [...tables, table]);
    return table;
  }

  async updateTable(tableId: string, data: Partial<RestaurantTable>): Promise<RestaurantTable | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected — cannot update table');
      return null;
    }
    this._error.set(null);

    const row = toRow(data);
    row['updated_at'] = new Date().toISOString();

    const { data: updated, error } = await supabase()
      .from(TABLE)
      .update(row)
      .eq('id', tableId)
      .eq('restaurant_id', this.merchantId)
      .select()
      .single();

    if (error) {
      this._error.set(error.message);
      return null;
    }

    const table = toModel(updated);
    this._tables.update(tables => tables.map(t => (t.id === tableId ? table : t)));
    return table;
  }

  async updatePosition(tableId: string, posX: number, posY: number): Promise<void> {
    await this.updateTable(tableId, { posX, posY });
  }

  async updateStatus(tableId: string, status: string): Promise<void> {
    await this.updateTable(tableId, { status });
  }

  async deleteTable(tableId: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected — cannot delete table');
      return false;
    }
    this._error.set(null);

    const { error } = await supabase()
      .from(TABLE)
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', tableId)
      .eq('restaurant_id', this.merchantId);

    if (error) {
      this._error.set(error.message);
      return false;
    }

    this._tables.update(tables => tables.filter(t => t.id !== tableId));
    return true;
  }
}
