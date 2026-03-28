export type WasteCategory = 'prep_loss' | 'spoilage' | 'customer_return' | 'damaged' | 'overproduction';

export interface WasteEntry {
  id: string;
  inventoryItemId: string;
  itemName: string;
  category: WasteCategory;
  quantity: number;
  unit: string;
  estimatedCost: number;
  reason?: string;
  recordedBy?: string;
  createdAt: Date;
}

export interface WasteSummary {
  totalEntries: number;
  totalCost: number;
  byCategory: Record<WasteCategory, { count: number; cost: number }>;
  topWastedItems: { name: string; totalCost: number; count: number }[];
}

export interface WasteRecommendation {
  title: string;
  description: string;
  estimatedSavings: string;
  priority: 'high' | 'medium' | 'low';
  category: WasteCategory;
}

export type WasteTab = 'log' | 'analysis' | 'recommendations';
