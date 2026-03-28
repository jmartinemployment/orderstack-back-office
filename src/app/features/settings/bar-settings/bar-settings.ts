import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import { BarSoundName } from '../../../models/index';
@Component({
  selector: 'os-bar-settings',
  imports: [FormsModule],
  templateUrl: './bar-settings.html',
  styleUrl: './bar-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarSettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;
  readonly allCategories = this.menuService.activeCategories;

  // Local form signals
  private readonly _beverageCategoryIds = signal<Set<string>>(new Set());
  private readonly _defaultMode = signal<'create' | 'incoming'>('create');
  private readonly _soundEnabled = signal(true);
  private readonly _soundName = signal<BarSoundName>('chime');
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly beverageCategoryIds = this._beverageCategoryIds.asReadonly();
  readonly defaultMode = this._defaultMode.asReadonly();
  readonly soundEnabled = this._soundEnabled.asReadonly();
  readonly soundName = this._soundName.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly soundOptions: { value: BarSoundName; label: string }[] = [
    { value: 'chime', label: 'Chime' },
    { value: 'bell', label: 'Bell' },
    { value: 'ding', label: 'Ding' },
  ];

  readonly selectedCategoryCount = computed(() => this._beverageCategoryIds().size);

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  ngOnInit(): void {
    this.menuService.loadMenu();
    this.loadFromService();
  }

  private loadFromService(): void {
    const s = this.settingsService.barSettings();
    this._beverageCategoryIds.set(new Set(s.beverageCategoryIds));
    this._defaultMode.set(s.defaultMode);
    this._soundEnabled.set(s.soundEnabled);
    this._soundName.set(s.soundName);
    this._hasUnsavedChanges.set(false);
  }

  isCategorySelected(catId: string): boolean {
    return this._beverageCategoryIds().has(catId);
  }

  toggleCategory(catId: string): void {
    this._beverageCategoryIds.update(ids => {
      const next = new Set(ids);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
    this._hasUnsavedChanges.set(true);
  }

  selectAllCategories(): void {
    const all = new Set(this.allCategories().map(c => c.id));
    this._beverageCategoryIds.set(all);
    this._hasUnsavedChanges.set(true);
  }

  clearAllCategories(): void {
    this._beverageCategoryIds.set(new Set());
    this._hasUnsavedChanges.set(true);
  }

  onDefaultModeChange(mode: 'create' | 'incoming'): void {
    this._defaultMode.set(mode);
    this._hasUnsavedChanges.set(true);
  }

  onSoundEnabledToggle(event: Event): void {
    this._soundEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onSoundNameChange(value: BarSoundName): void {
    this._soundName.set(value);
    this._hasUnsavedChanges.set(true);
  }

  previewSound(): void {
    const audio = new Audio(`assets/sounds/${this._soundName()}.mp3`);
    audio.play().catch(() => {
      // Audio play may be blocked by browser autoplay policy — ignore
    });
  }

  async save(): Promise<void> {
    await this.settingsService.saveBarSettings({
      beverageCategoryIds: [...this._beverageCategoryIds()],
      defaultMode: this._defaultMode(),
      soundEnabled: this._soundEnabled(),
      soundName: this._soundName(),
    });
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }
}
