import '../../../../test-setup';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ModifierPrompt, type ModifierPromptResult } from './modifier-prompt';
import type { MenuItem, ModifierGroup, Modifier } from '@models/menu.model';

function createModifier(id: string, name: string, price = 0): Modifier {
  return { id, name, priceAdjustment: price, isDefault: false, isActive: true };
}

function createGroup(overrides: Partial<ModifierGroup> & { id: string; name: string }): ModifierGroup {
  return {
    required: false,
    multiSelect: false,
    minSelections: 0,
    maxSelections: 0,
    modifiers: [],
    ...overrides,
  };
}

function createMenuItem(groups: ModifierGroup[]): MenuItem {
  return {
    id: 'item-1',
    name: 'Test Item',
    price: 10,
    modifierGroups: groups,
  };
}

type PromptHarness = {
  component: ModifierPrompt;
  emitted: ModifierPromptResult[];
};

function createHarness(groups: ModifierGroup[]): PromptHarness {
  const item = createMenuItem(groups);

  TestBed.configureTestingModule({});

  // Set required input via TestBed — use ComponentRef approach
  const fixture = TestBed.createComponent(ModifierPrompt);
  fixture.componentRef.setInput('menuItem', item);
  fixture.componentRef.setInput('defaultQuantity', 1);

  const comp = fixture.componentInstance;
  const emitted: ModifierPromptResult[] = [];
  comp.confirmed.subscribe((result: ModifierPromptResult) => emitted.push(result));

  comp.ngOnInit();
  return { component: comp, emitted };
}

describe('ModifierPrompt', () => {
  const textGroup = createGroup({
    id: 'g-text',
    name: 'Special Request',
    allowTextModifier: true,
    textModifierLabel: 'Custom Label',
    modifiers: [createModifier('m1', 'Extra Cheese', 1.5)],
  });

  const requiredGroup = createGroup({
    id: 'g-req',
    name: 'Size',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    modifiers: [
      createModifier('m-sm', 'Small'),
      createModifier('m-lg', 'Large', 2),
    ],
  });

  const optionalGroup = createGroup({
    id: 'g-opt',
    name: 'Extras',
    multiSelect: true,
    maxSelections: 3,
    modifiers: [
      createModifier('m-a', 'A', 0.5),
      createModifier('m-b', 'B', 0.75),
    ],
  });

  it('emitResult includes textModifiers when text input has value', () => {
    const harness = createHarness([textGroup]);
    harness.component.onTextModifierInput('g-text', 'No onions please');
    harness.component.onNext();

    expect(harness.emitted).toHaveLength(1);
    expect(harness.emitted[0].textModifiers).toEqual([
      { groupId: 'g-text', label: 'Custom Label', value: 'No onions please' },
    ]);
  });

  it('emitResult omits textModifiers when text input is empty/whitespace', () => {
    const harness = createHarness([textGroup]);
    harness.component.onTextModifierInput('g-text', '   ');
    harness.component.onNext();

    expect(harness.emitted).toHaveLength(1);
    expect(harness.emitted[0].textModifiers).toBeUndefined();
  });

  it('onTextModifierInput stores value by group ID', () => {
    const harness = createHarness([textGroup]);
    harness.component.onTextModifierInput('g-text', 'hello');
    expect(harness.component.currentTextValue()).toBe('hello');
  });

  it('currentTextValue returns empty string for unknown group', () => {
    const harness = createHarness([
      createGroup({ id: 'g-other', name: 'Other', modifiers: [] }),
    ]);
    expect(harness.component.currentTextValue()).toBe('');
  });

  it('toggleModifier adds and removes a modifier', () => {
    const harness = createHarness([optionalGroup]);
    const modA = optionalGroup.modifiers[0];

    harness.component.toggleModifier(modA);
    expect(harness.component.currentSelections()).toHaveLength(1);
    expect(harness.component.currentSelections()[0].id).toBe('m-a');

    harness.component.toggleModifier(modA);
    expect(harness.component.currentSelections()).toHaveLength(0);
  });

  it('canAdvance respects required group minimum selections', () => {
    const harness = createHarness([requiredGroup]);
    expect(harness.component.canAdvance()).toBe(false);

    harness.component.toggleModifier(requiredGroup.modifiers[0]);
    expect(harness.component.canAdvance()).toBe(true);
  });

  it('onNext advances to next group index', () => {
    const harness = createHarness([optionalGroup, textGroup]);
    expect(harness.component.currentGroupIndex()).toBe(0);

    harness.component.onNext();
    expect(harness.component.currentGroupIndex()).toBe(1);
  });

  it('onSkip skips optional group', () => {
    const harness = createHarness([optionalGroup, textGroup]);
    harness.component.onSkip();
    expect(harness.component.currentGroupIndex()).toBe(1);
  });

  it('onSkip does not skip required group', () => {
    const harness = createHarness([requiredGroup, textGroup]);
    harness.component.onSkip();
    expect(harness.component.currentGroupIndex()).toBe(0);
  });

  it('quantity and itemTotal compute correctly with modifiers', () => {
    const harness = createHarness([optionalGroup]);
    harness.component.setQuantity(3);
    harness.component.toggleModifier(optionalGroup.modifiers[0]); // +0.50

    // base 10 + 0.50 modifier = 10.50 * 3 = 31.50
    expect(harness.component.quantity()).toBe(3);
    expect(harness.component.itemTotal()).toBeCloseTo(31.5);
  });
});
