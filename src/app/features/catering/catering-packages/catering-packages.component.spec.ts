import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringPackagesComponent } from './catering-packages.component';

function createComponent(): CateringPackagesComponent {
  return TestBed.runInInjectionContext(() => new CateringPackagesComponent());
}

describe('CateringPackagesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('form defaults to new package state', () => {
    const component = createComponent();
    const form = component._form();
    expect(form.name).toBe('');
    expect(form.tier).toBe('standard');
    expect(form.pricingModel).toBe('per_person');
    expect(form.pricePerUnitDollars).toBe(0);
    expect(form.minimumHeadcount).toBe(1);
    expect(form.menuItemIds).toEqual([]);
  });

  it('openNewForm resets form and shows panel', () => {
    const component = createComponent();
    component._form.set({ name: 'Test', tier: 'premium', pricingModel: 'flat', pricePerUnitDollars: 100, minimumHeadcount: 10, description: 'desc', menuItemIds: ['a'] });
    component.openNewForm();
    expect(component._showForm()).toBe(true);
    expect(component._editingId()).toBeNull();
    expect(component._form().name).toBe('');
  });

  it('closeForm hides panel', () => {
    const component = createComponent();
    component._showForm.set(true);
    component.closeForm();
    expect(component._showForm()).toBe(false);
  });

  it('toggleExpand toggles expanded id', () => {
    const component = createComponent();
    component.toggleExpand('pkg-1');
    expect(component._expandedId()).toBe('pkg-1');
    component.toggleExpand('pkg-1');
    expect(component._expandedId()).toBeNull();
  });

  it('confirmDelete and cancelDelete work correctly', () => {
    const component = createComponent();
    component.confirmDelete('pkg-1');
    expect(component._confirmDeleteId()).toBe('pkg-1');
    component.cancelDelete();
    expect(component._confirmDeleteId()).toBeNull();
  });

  it('tierLabels and pricingModelLabels are defined', () => {
    const component = createComponent();
    expect(component.tierLabels.standard).toBe('Standard');
    expect(component.pricingModelLabels.per_person).toBe('Per Person');
  });
});
