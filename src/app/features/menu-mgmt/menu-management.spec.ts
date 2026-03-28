import '../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { MenuManagement } from './menu-management';
import { AuthService } from '../../services/auth';

function createMockAuthService() {
  const _token = signal('tok');
  const _user = signal({ firstName: 'Jeff' });
  return {
    isAuthenticated: computed(() => !!_token() && !!_user()),
    user: _user.asReadonly(),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
    selectedMerchantName: signal<string | null>('Test').asReadonly(),
    merchants: signal([{ id: 'r-1' }]).asReadonly(),
    userMerchants: computed(() => ['r-1']),
    selectMerchant: vi.fn(),
  };
}

describe('MenuManagement', () => {
  let fixture: ComponentFixture<MenuManagement>;
  let component: MenuManagement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MenuManagement],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])), post: vi.fn().mockReturnValue(of({})), put: vi.fn().mockReturnValue(of({})), delete: vi.fn().mockReturnValue(of({})) } },
      ],
    });
    fixture = TestBed.createComponent(MenuManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to categories tab', () => {
    expect(component.activeTab()).toBe('categories');
  });

  it('renders page title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toBe('Menu Management');
  });

  it('renders 4 tab buttons', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.os-tab');
    expect(tabs.length).toBe(4);
  });

  it('renders tab labels correctly', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.os-tab');
    expect(tabs[0].textContent.trim()).toBe('Categories');
    expect(tabs[1].textContent.trim()).toBe('Items');
    expect(tabs[2].textContent.trim()).toBe('Modifiers');
    expect(tabs[3].textContent.trim()).toContain('Schedules');
  });

  it('marks categories tab as active by default', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.os-tab');
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
  });

  it('switches to items tab on click', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.os-tab');
    tabs[1].click();
    fixture.detectChanges();
    expect(component.activeTab()).toBe('items');
    expect(tabs[1].classList.contains('active')).toBe(true);
  });

  it('switches to modifiers tab on click', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.os-tab');
    tabs[2].click();
    fixture.detectChanges();
    expect(component.activeTab()).toBe('modifiers');
  });

  it('switches to schedules tab on click', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.os-tab');
    tabs[3].click();
    fixture.detectChanges();
    expect(component.activeTab()).toBe('schedules');
  });

  it('renders os-category-management on categories tab', () => {
    expect(fixture.nativeElement.querySelector('os-category-management')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('os-item-management')).toBeNull();
  });

  it('renders os-item-management on items tab', () => {
    component.activeTab.set('items');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('os-item-management')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('os-category-management')).toBeNull();
  });

  it('renders os-modifier-management on modifiers tab', () => {
    component.activeTab.set('modifiers');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('os-modifier-management')).toBeTruthy();
  });

  it('renders os-schedule-management on schedules tab', () => {
    component.activeTab.set('schedules');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('os-schedule-management')).toBeTruthy();
  });
});
