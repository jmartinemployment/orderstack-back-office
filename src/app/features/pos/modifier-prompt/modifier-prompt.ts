import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuItem, Modifier } from '../../../models/menu.model';

export interface ModifierSelection {
  groupId: string;
  groupName: string;
  modifiers: Modifier[];
}

export interface TextModifierEntry {
  groupId: string;
  label: string;
  value: string;
}

export interface ModifierPromptResult {
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: Modifier[];
  textModifiers?: TextModifierEntry[];
  seatNumber?: number;
  specialInstructions?: string;
}

@Component({
  selector: 'os-modifier-prompt',
  imports: [CurrencyPipe],
  templateUrl: './modifier-prompt.html',
  styleUrl: './modifier-prompt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModifierPrompt implements OnInit {
  readonly menuItem = input.required<MenuItem>();
  readonly defaultQuantity = input(1);
  readonly defaultSeatNumber = input<number | undefined>(undefined);

  readonly confirmed = output<ModifierPromptResult>();
  readonly cancelled = output<void>();

  private readonly _currentGroupIndex = signal(0);
  private readonly _selections = signal<Map<string, Modifier[]>>(new Map());
  private readonly _textModifierValues = signal<Map<string, string>>(new Map());
  private readonly _quantity = signal(1);
  private readonly _seatNumber = signal<number | undefined>(undefined);
  private readonly _specialInstructions = signal('');
  private readonly _error = signal<string | null>(null);

  readonly quantity = this._quantity.asReadonly();
  readonly seatNumber = this._seatNumber.asReadonly();
  readonly specialInstructions = this._specialInstructions.asReadonly();
  readonly error = this._error.asReadonly();

  readonly groups = computed(() => {
    const item = this.menuItem();
    return item.modifierGroups ?? [];
  });

  readonly currentGroupIndex = this._currentGroupIndex.asReadonly();

  readonly currentGroup = computed(() => {
    const groups = this.groups();
    const idx = this._currentGroupIndex();
    return idx < groups.length ? groups[idx] : null;
  });

  readonly isLastGroup = computed(() =>
    this._currentGroupIndex() >= this.groups().length - 1
  );

  readonly hasGroups = computed(() => this.groups().length > 0);

  readonly progress = computed(() => {
    const total = this.groups().length;
    if (total === 0) return 100;
    return Math.round(((this._currentGroupIndex() + 1) / total) * 100);
  });

  readonly currentSelections = computed(() => {
    const group = this.currentGroup();
    if (!group) return [];
    return this._selections().get(group.id) ?? [];
  });

  readonly currentTextValue = computed(() => {
    const group = this.currentGroup();
    if (!group) return '';
    return this._textModifierValues().get(group.id) ?? '';
  });

  readonly allSelectedModifiers = computed(() => {
    const all: Modifier[] = [];
    for (const mods of this._selections().values()) {
      all.push(...mods);
    }
    return all;
  });

  readonly totalModifierPrice = computed(() =>
    this.allSelectedModifiers().reduce((sum, m) => sum + m.priceAdjustment, 0)
  );

  readonly itemTotal = computed(() => {
    const base = Number(this.menuItem().price);
    return (base + this.totalModifierPrice()) * this._quantity();
  });

  ngOnInit(): void {
    this._quantity.set(this.defaultQuantity());
    this._seatNumber.set(this.defaultSeatNumber());

    // Skip prompt if no modifier groups — emit immediately
    if (this.groups().length === 0) {
      this.emitResult();
    }
  }

  isModifierSelected(modifier: Modifier): boolean {
    const selected = this.currentSelections();
    return selected.some(m => m.id === modifier.id);
  }

  toggleModifier(modifier: Modifier): void {
    const group = this.currentGroup();
    if (!group) return;

    this._error.set(null);
    const current = [...(this._selections().get(group.id) ?? [])];
    const idx = current.findIndex(m => m.id === modifier.id);

    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (!group.multiSelect) {
        current.length = 0;
      }
      if (group.maxSelections > 0 && current.length >= group.maxSelections) {
        this._error.set(`Maximum ${group.maxSelections} selections`);
        return;
      }
      current.push(modifier);
    }

    this._selections.update(map => {
      const updated = new Map(map);
      updated.set(group.id, current);
      return updated;
    });
  }

  onTextModifierInput(groupId: string, value: string): void {
    this._textModifierValues.update(map => {
      const updated = new Map(map);
      updated.set(groupId, value);
      return updated;
    });
  }

  canAdvance(): boolean {
    const group = this.currentGroup();
    if (!group) return true;

    if (group.required) {
      const selected = this.currentSelections();
      if (selected.length < group.minSelections) return false;
    }
    return true;
  }

  onNext(): void {
    if (!this.canAdvance()) {
      const group = this.currentGroup();
      this._error.set(`Select at least ${group?.minSelections ?? 1} option${(group?.minSelections ?? 1) > 1 ? 's' : ''}`);
      return;
    }

    if (this.isLastGroup()) {
      this.emitResult();
    } else {
      this._currentGroupIndex.update(i => i + 1);
      this._error.set(null);
    }
  }

  onSkip(): void {
    const group = this.currentGroup();
    if (group?.required) return;

    if (this.isLastGroup()) {
      this.emitResult();
    } else {
      this._currentGroupIndex.update(i => i + 1);
      this._error.set(null);
    }
  }

  onBack(): void {
    if (this._currentGroupIndex() > 0) {
      this._currentGroupIndex.update(i => i - 1);
      this._error.set(null);
    }
  }

  setQuantity(qty: number): void {
    this._quantity.set(Math.max(1, qty));
  }

  setSeatNumber(seat: number | undefined): void {
    this._seatNumber.set(seat);
  }

  setSpecialInstructions(val: string): void {
    this._specialInstructions.set(val);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private emitResult(): void {
    // Collect non-empty text modifier values
    const textModifiers: TextModifierEntry[] = [];
    for (const group of this.groups()) {
      if (group.allowTextModifier) {
        const value = (this._textModifierValues().get(group.id) ?? '').trim();
        if (value) {
          textModifiers.push({
            groupId: group.id,
            label: group.textModifierLabel ?? group.name,
            value,
          });
        }
      }
    }

    this.confirmed.emit({
      menuItem: this.menuItem(),
      quantity: this._quantity(),
      selectedModifiers: this.allSelectedModifiers(),
      textModifiers: textModifiers.length > 0 ? textModifiers : undefined,
      seatNumber: this._seatNumber(),
      specialInstructions: this._specialInstructions() || undefined,
    });
  }
}
