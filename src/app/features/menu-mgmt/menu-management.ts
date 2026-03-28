import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CategoryManagement } from './category-management/category-management';
import { ItemManagement } from './item-management/item-management';
import { ModifierManagement } from './modifier-management/modifier-management';
import { ScheduleManagement } from './schedule-management/schedule-management';

type MenuTab = 'categories' | 'items' | 'modifiers' | 'schedules';

@Component({
  selector: 'os-menu-management',
  standalone: true,
  imports: [CategoryManagement, ItemManagement, ModifierManagement, ScheduleManagement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="menu-management px-2">
    <div class="os-page-header">
      <h1>Menu Management</h1>
    </div>
    <div class="os-page-content">
      <div class="os-tabs">
        <button class="os-tab" [class.active]="activeTab() === 'categories'" (click)="activeTab.set('categories')">Categories</button>
        <button class="os-tab" [class.active]="activeTab() === 'items'" (click)="activeTab.set('items')">Items</button>
        <button class="os-tab" [class.active]="activeTab() === 'modifiers'" (click)="activeTab.set('modifiers')">Modifiers</button>
        <button class="os-tab" [class.active]="activeTab() === 'schedules'" (click)="activeTab.set('schedules')">
          <i class="bi bi-clock me-1"></i>Schedules
        </button>
      </div>
      <div class="tab-content">
        @if (activeTab() === 'categories') {
          <os-category-management />
        } @else if (activeTab() === 'items') {
          <os-item-management />
        } @else if (activeTab() === 'modifiers') {
          <os-modifier-management />
        } @else if (activeTab() === 'schedules') {
          <os-schedule-management />
        }
      </div>
    </div>
    </div>
  `,
  styles: [`
    .tab-content {
      margin-top: 16px;
    }
  `],
})
export class MenuManagement {
  private readonly route = inject(ActivatedRoute);

  // Live signal from the router's query params — resolves correctly in zoneless mode
  private readonly queryParams = toSignal(this.route.queryParamMap);

  // Derives the initial tab from ?type query param; manual tab clicks override via set()
  readonly activeTab = signal<MenuTab>(
    this.route.snapshot.queryParamMap.has('type') ? 'items' : 'categories'
  );

  // Keep activeTab in sync if query params change while component is alive (e.g. browser back/forward)
  readonly _syncTab = computed(() => {
    const params = this.queryParams();
    if (params?.has('type')) {
      this.activeTab.set('items');
    }
  });
}
