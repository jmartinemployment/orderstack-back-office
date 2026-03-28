import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { StationService } from '../../../services/station';
import { MenuService } from '../../../services/menu';
import { KdsStation, StationFormData, MenuCategory } from '../../../models/index';

@Component({
  selector: 'os-station-settings',
  templateUrl: './station-settings.html',
  styleUrl: './station-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationSettings implements OnInit {
  private readonly stationService = inject(StationService);
  private readonly menuService = inject(MenuService);

  readonly stations = this.stationService.stations;
  readonly isLoading = this.stationService.isLoading;
  readonly error = this.stationService.error;

  /** Flatten to actual MenuCategory records (subcategories), not PrimaryCategory groupings.
   *  StationCategoryMapping FK references menu_categories, not primary_categories. */
  readonly categories = computed(() => {
    const topLevel = this.menuService.categories();
    const flat: MenuCategory[] = [];
    for (const cat of topLevel) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        flat.push(...cat.subcategories.filter(s => s.isActive !== false));
      }
      // Skip top-level entries with 0 subcategories — they are PrimaryCategory
      // containers whose IDs reference primary_categories, not menu_categories.
    }
    return flat;
  });

  // Modal state
  private readonly _showModal = signal(false);
  private readonly _editingStation = signal<KdsStation | null>(null);
  private readonly _formName = signal('');
  private readonly _formColor = signal('#0d6efd');
  private readonly _formDisplayOrder = signal(0);
  private readonly _formIsExpo = signal(false);
  private readonly _formIsActive = signal(true);
  private readonly _saving = signal(false);

  // Category assignment state
  private readonly _assigningStationId = signal<string | null>(null);
  private readonly _assigningCategoryIds = signal<Set<string>>(new Set());
  private readonly _assigningSaving = signal(false);

  // Delete confirmation
  private readonly _deleteConfirmId = signal<string | null>(null);

  readonly showModal = this._showModal.asReadonly();
  readonly editingStation = this._editingStation.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formColor = this._formColor.asReadonly();
  readonly formDisplayOrder = this._formDisplayOrder.asReadonly();
  readonly formIsExpo = this._formIsExpo.asReadonly();
  readonly formIsActive = this._formIsActive.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly assigningStationId = this._assigningStationId.asReadonly();
  readonly assigningSaving = this._assigningSaving.asReadonly();
  readonly deleteConfirmId = this._deleteConfirmId.asReadonly();

  readonly isEditing = computed(() => this._editingStation() !== null);

  /** Categories not assigned to any station. */
  readonly unassignedCategories = computed(() => {
    const catToStation = this.stationService.categoryToStationMap();
    return this.categories().filter(c => !catToStation.has(c.id));
  });

  /** Comma-separated names of unassigned categories (for template use). */
  readonly unassignedCategoryNames = computed(() =>
    this.unassignedCategories().map(c => c.name).join(', ')
  );

  /** Get the station name that a category is assigned to. */
  getCategoryStationName(categoryId: string): string | null {
    const stationId = this.stationService.categoryToStationMap().get(categoryId);
    if (!stationId) return null;
    return this.stations().find(s => s.id === stationId)?.name ?? null;
  }

  /** Check if a category is assigned to the currently-editing station. */
  isCategoryAssigned(categoryId: string): boolean {
    return this._assigningCategoryIds().has(categoryId);
  }

  /** Check if a category is assigned to a DIFFERENT station. */
  isCategoryAssignedElsewhere(categoryId: string): boolean {
    const stationId = this.stationService.categoryToStationMap().get(categoryId);
    return stationId !== undefined && stationId !== this._assigningStationId();
  }

  ngOnInit(): void {
    this.stationService.loadStations();
    this.stationService.loadCategoryMappings();
    this.menuService.loadMenu();
  }

  openAddModal(): void {
    this._editingStation.set(null);
    this._formName.set('');
    this._formColor.set('#0d6efd');
    this._formDisplayOrder.set(this.stations().length);
    this._formIsExpo.set(false);
    this._formIsActive.set(true);
    this._showModal.set(true);
  }

  openEditModal(station: KdsStation): void {
    this._editingStation.set(station);
    this._formName.set(station.name);
    this._formColor.set(station.color ?? '#0d6efd');
    this._formDisplayOrder.set(station.displayOrder);
    this._formIsExpo.set(station.isExpo);
    this._formIsActive.set(station.isActive);
    this._showModal.set(true);
  }

  closeModal(): void {
    this._showModal.set(false);
    this._editingStation.set(null);
  }

  setFormName(event: Event): void {
    this._formName.set((event.target as HTMLInputElement).value);
  }

  setFormColor(event: Event): void {
    this._formColor.set((event.target as HTMLInputElement).value);
  }

  setFormDisplayOrder(event: Event): void {
    this._formDisplayOrder.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 0);
  }

  setFormIsExpo(event: Event): void {
    this._formIsExpo.set((event.target as HTMLInputElement).checked);
  }

  setFormIsActive(event: Event): void {
    this._formIsActive.set((event.target as HTMLInputElement).checked);
  }

  async saveStation(): Promise<void> {
    if (this._saving()) return;
    this._saving.set(true);

    const data: StationFormData = {
      name: this._formName(),
      color: this._formColor(),
      displayOrder: this._formDisplayOrder(),
      isExpo: this._formIsExpo(),
      isActive: this._formIsActive(),
    };

    const editing = this._editingStation();
    if (editing) {
      await this.stationService.updateStation(editing.id, data);
    } else {
      await this.stationService.createStation(data);
    }

    this._saving.set(false);
    this.closeModal();
  }

  confirmDelete(stationId: string): void {
    this._deleteConfirmId.set(stationId);
  }

  cancelDelete(): void {
    this._deleteConfirmId.set(null);
  }

  async deleteStation(stationId: string): Promise<void> {
    await this.stationService.deleteStation(stationId);
    this._deleteConfirmId.set(null);
  }

  // Category assignment
  openCategoryAssignment(station: KdsStation): void {
    this._assigningStationId.set(station.id);
    this._assigningCategoryIds.set(new Set(station.categoryIds));
  }

  closeCategoryAssignment(): void {
    this._assigningStationId.set(null);
    this._assigningCategoryIds.set(new Set());
  }

  toggleCategoryAssignment(categoryId: string): void {
    this._assigningCategoryIds.update(set => {
      const next = new Set(set);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  async saveCategoryAssignment(): Promise<void> {
    const stationId = this._assigningStationId();
    if (!stationId || this._assigningSaving()) return;
    this._assigningSaving.set(true);

    await this.stationService.setCategoryMappings(stationId, [...this._assigningCategoryIds()]);

    this._assigningSaving.set(false);
    this.closeCategoryAssignment();
  }
}
