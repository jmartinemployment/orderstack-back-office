import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { InventoryService } from '../../../services/inventory';
import { AuthService } from '../../../services/auth';
import {
  WasteEntry,
  WasteCategory,
  WasteSummary,
  WasteRecommendation,
  WasteTab,
} from '../../../models/waste.model';

const WASTE_CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: 'prep_loss', label: 'Prep Loss' },
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'overproduction', label: 'Overproduction' },
];

@Component({
  selector: 'os-waste-tracker',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './waste-tracker.html',
  styleUrl: './waste-tracker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WasteTracker {
  private readonly inventoryService = inject(InventoryService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly inventoryItems = this.inventoryService.items;

  private readonly _activeTab = signal<WasteTab>('log');
  private readonly _entries = signal<WasteEntry[]>([]);
  private readonly _showForm = signal(false);
  private readonly _categoryFilter = signal<WasteCategory | 'all'>('all');

  // Form signals
  private readonly _formItemId = signal('');
  private readonly _formCategory = signal<WasteCategory>('prep_loss');
  private readonly _formQuantity = signal(0);
  private readonly _formReason = signal('');

  readonly recommendations = computed<WasteRecommendation[]>(() => {
    const entries = this._entries();
    if (entries.length === 0) return [];

    const recs: WasteRecommendation[] = [];

    const catRec = this.buildCategoryRecommendation(entries);
    if (catRec) recs.push(catRec);

    const itemRec = this.buildItemRecommendation(entries);
    if (itemRec) recs.push(itemRec);

    const dayRec = this.buildDayRecommendation(entries);
    if (dayRec) recs.push(dayRec);

    return recs;
  });

  private buildCategoryRecommendation(entries: WasteEntry[]): WasteRecommendation | null {
    const catCosts = new Map<WasteCategory, number>();
    for (const entry of entries) {
      catCosts.set(entry.category, (catCosts.get(entry.category) ?? 0) + entry.estimatedCost);
    }
    let topCat: WasteCategory | null = null;
    let topCatCost = 0;
    for (const [cat, cost] of catCosts) {
      if (cost > topCatCost) {
        topCat = cat;
        topCatCost = cost;
      }
    }
    if (!topCat) return null;

    const label = this.getCategoryLabel(topCat);
    let priority: 'high' | 'medium' | 'low';
    if (topCatCost > 100) {
      priority = 'high';
    } else if (topCatCost > 50) {
      priority = 'medium';
    } else {
      priority = 'low';
    }
    return {
      title: `Reduce ${label.toLowerCase()} waste`,
      description: `${label} is your highest waste category at $${topCatCost.toFixed(2)}. Review processes to reduce this category.`,
      estimatedSavings: `$${Math.round(topCatCost)}/total`,
      priority,
      category: topCat,
    };
  }

  private buildItemRecommendation(entries: WasteEntry[]): WasteRecommendation | null {
    const itemCosts = new Map<string, { name: string; cost: number; count: number; category: WasteCategory }>();
    for (const entry of entries) {
      const existing = itemCosts.get(entry.inventoryItemId);
      if (existing) {
        existing.cost += entry.estimatedCost;
        existing.count++;
      } else {
        itemCosts.set(entry.inventoryItemId, { name: entry.itemName, cost: entry.estimatedCost, count: 1, category: entry.category });
      }
    }
    const topItem = [...itemCosts.values()].sort((a, b) => b.cost - a.cost).at(0);
    if (!topItem || topItem.count < 2) return null;

    return {
      title: `Address ${topItem.name} waste`,
      description: `${topItem.name} has been wasted ${topItem.count} times totaling $${topItem.cost.toFixed(2)}. Consider adjusting order quantities or storage.`,
      estimatedSavings: `$${Math.round(topItem.cost * 0.5)}/potential`,
      priority: topItem.cost > 50 ? 'high' : 'medium',
      category: topItem.category,
    };
  }

  private buildDayRecommendation(entries: WasteEntry[]): WasteRecommendation | null {
    const dayCosts = new Map<number, number>();
    for (const entry of entries) {
      const day = entry.createdAt.getDay();
      dayCosts.set(day, (dayCosts.get(day) ?? 0) + entry.estimatedCost);
    }
    if (dayCosts.size < 2) return null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let peakDay = -1;
    let peakCost = 0;
    for (const [day, cost] of dayCosts) {
      if (cost > peakCost) {
        peakDay = day;
        peakCost = cost;
      }
    }
    if (peakDay < 0) return null;

    return {
      title: `Review ${dayNames[peakDay]} operations`,
      description: `${dayNames[peakDay]} shows the highest waste at $${peakCost.toFixed(2)}. Adjust prep quantities for this day.`,
      estimatedSavings: `$${Math.round(peakCost * 0.3)}/potential`,
      priority: 'medium',
      category: 'overproduction',
    };
  }

  readonly activeTab = this._activeTab.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();
  readonly formItemId = this._formItemId.asReadonly();
  readonly formCategory = this._formCategory.asReadonly();
  readonly formQuantity = this._formQuantity.asReadonly();
  readonly formReason = this._formReason.asReadonly();

  readonly wasteCategories = WASTE_CATEGORIES;

  readonly filteredEntries = computed(() => {
    const cat = this._categoryFilter();
    const list = this._entries();
    return cat === 'all' ? list : list.filter(e => e.category === cat);
  });

  readonly summary = computed<WasteSummary>(() => {
    const entries = this._entries();
    const byCategory = {} as Record<WasteCategory, { count: number; cost: number }>;
    for (const cat of WASTE_CATEGORIES) {
      const catEntries = entries.filter(e => e.category === cat.value);
      byCategory[cat.value] = {
        count: catEntries.length,
        cost: catEntries.reduce((sum, e) => sum + e.estimatedCost, 0),
      };
    }

    const itemMap = new Map<string, { name: string; totalCost: number; count: number }>();
    for (const entry of entries) {
      const existing = itemMap.get(entry.inventoryItemId);
      if (existing) {
        existing.totalCost += entry.estimatedCost;
        existing.count++;
      } else {
        itemMap.set(entry.inventoryItemId, {
          name: entry.itemName,
          totalCost: entry.estimatedCost,
          count: 1,
        });
      }
    }

    const topWasted = [...itemMap.values()]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      totalCost: entries.reduce((sum, e) => sum + e.estimatedCost, 0),
      byCategory,
      topWastedItems: topWasted,
    };
  });

  readonly totalWasteCost = computed(() => this.summary().totalCost);

  setTab(tab: WasteTab): void {
    this._activeTab.set(tab);
  }

  setCategoryFilter(cat: WasteCategory | 'all'): void {
    this._categoryFilter.set(cat);
  }

  openForm(): void {
    this._formItemId.set('');
    this._formCategory.set('prep_loss');
    this._formQuantity.set(0);
    this._formReason.set('');
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'item': this._formItemId.set(value); break;
      case 'category': this._formCategory.set(value as WasteCategory); break;
      case 'quantity': this._formQuantity.set(Number.parseFloat(value) || 0); break;
      case 'reason': this._formReason.set(value); break;
    }
  }

  logWaste(): void {
    const itemId = this._formItemId();
    const qty = this._formQuantity();
    if (!itemId || qty <= 0) return;

    const invItem = this.inventoryItems().find(i => i.id === itemId);
    if (!invItem) return;

    const entry: WasteEntry = {
      id: crypto.randomUUID(),
      inventoryItemId: itemId,
      itemName: invItem.name,
      category: this._formCategory(),
      quantity: qty,
      unit: invItem.unit,
      estimatedCost: qty * invItem.costPerUnit,
      reason: this._formReason().trim() || undefined,
      createdAt: new Date(),
    };

    this._entries.update(prev => [entry, ...prev]);

    // Also record usage in inventory service
    this.inventoryService.recordUsage(
      itemId,
      qty,
      `Waste: ${this.getCategoryLabel(this._formCategory())}${this._formReason() ? ' - ' + this._formReason() : ''}`
    );

    this.closeForm();
  }

  deleteEntry(entryId: string): void {
    this._entries.update(prev => prev.filter(e => e.id !== entryId));
  }

  getCategoryLabel(cat: WasteCategory): string {
    return WASTE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  getCategoryClass(cat: WasteCategory): string {
    switch (cat) {
      case 'prep_loss': return 'cat-prep';
      case 'spoilage': return 'cat-spoilage';
      case 'customer_return': return 'cat-return';
      case 'damaged': return 'cat-damaged';
      case 'overproduction': return 'cat-overprod';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  }

  getCategoryPercent(cat: WasteCategory): number {
    const total = this.summary().totalCost;
    if (total === 0) return 0;
    return Math.round((this.summary().byCategory[cat].cost / total) * 100);
  }
}
