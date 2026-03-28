import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringRevenueReportComponent } from './catering-revenue-report.component';

function createComponent(): CateringRevenueReportComponent {
  return TestBed.runInInjectionContext(() => new CateringRevenueReportComponent());
}

describe('CateringRevenueReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('loading defaults to false', () => {
    const component = createComponent();
    expect(component._loading()).toBe(false);
  });

  it('report defaults to null', () => {
    const component = createComponent();
    expect(component._report()).toBeNull();
  });

  it('barWidth calculates percentage correctly', () => {
    const component = createComponent();
    expect(component.barWidth(500, 1000)).toBe('50%');
    expect(component.barWidth(1000, 1000)).toBe('100%');
    expect(component.barWidth(0, 0)).toBe('0%');
  });

  it('dismissError clears error signal', () => {
    const component = createComponent();
    component._error.set('some error');
    component.dismissError();
    expect(component._error()).toBeNull();
  });
});
