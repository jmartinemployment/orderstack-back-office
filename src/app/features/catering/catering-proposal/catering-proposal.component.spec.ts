import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringProposalComponent } from './catering-proposal.component';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function makeActivatedRoute(token: string) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'token' ? token : null),
      },
    },
  };
}

function createFixture(token = 'test-token-123'): ComponentFixture<CateringProposalComponent> {
  TestBed.overrideProvider(ActivatedRoute, { useValue: makeActivatedRoute(token) });
  const fixture = TestBed.createComponent(CateringProposalComponent);
  return fixture;
}

describe('CateringProposalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CateringProposalComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('sets error when token is empty', async () => {
    const fixture = createFixture('');
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await component.ngOnInit();
    expect(component.error()).toBe('Invalid proposal link.');
    expect(component.isLoading()).toBe(false);
  });

  it('isLoading starts true', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isLoading()).toBe(true);
  });

  it('job starts as null', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.job()).toBeNull();
  });

  it('approved starts as false', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.approved()).toBe(false);
  });

  it('formatCents formats correctly', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.formatCents(100000)).toBe('$1,000.00');
    expect(component.formatCents(0)).toBe('$0.00');
    expect(component.formatCents(5050)).toBe('$50.50');
  });

  it('getPricingLabel returns human-readable labels', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.getPricingLabel('per_person')).toBe('per person');
    expect(component.getPricingLabel('per_tray')).toBe('per tray');
    expect(component.getPricingLabel('flat')).toBe('flat rate');
    expect(component.getPricingLabel('custom')).toBe('custom');
  });

  it('getTierLabel returns human-readable labels', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.getTierLabel('standard')).toBe('Standard');
    expect(component.getTierLabel('premium')).toBe('Premium');
    expect(component.getTierLabel('custom')).toBe('Custom');
    expect(component.getTierLabel('other')).toBe('other');
  });

  it('canApprove returns false when no package selected', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.canApprove()).toBe(false);
  });

  it('canApprove still requires e-consent and signature even with package selected', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.selectPackage('pkg-1');
    // electronicConsentGiven and hasSignature are still false — canApprove must remain false
    expect(component.canApprove()).toBe(false);
  });

  it('selectPackage sets selectedPackageId', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.selectPackage('pkg-42');
    expect(component.selectedPackageId()).toBe('pkg-42');
  });

  it('toggleContractAcknowledged toggles the flag', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.contractAcknowledged()).toBe(false);
    component.toggleContractAcknowledged();
    expect(component.contractAcknowledged()).toBe(true);
    component.toggleContractAcknowledged();
    expect(component.contractAcknowledged()).toBe(false);
  });
});

describe('app.routes — public catering routes (BUG-23)', () => {
  const routeSource = readFileSync(
    resolve(__dirname, '../../../app.routes.ts'),
    'utf-8',
  );

  it('catering/proposal/:token route is registered', () => {
    expect(routeSource).toContain("path: 'catering/proposal/:token'");
    expect(routeSource).toContain('catering-proposal.component');
  });

  it('catering/portal/:token route is registered', () => {
    expect(routeSource).toContain("path: 'catering/portal/:token'");
    expect(routeSource).toContain('catering-guest-portal.component');
  });

  it('catering/inquiry/:merchantSlug route is registered', () => {
    expect(routeSource).toContain("path: 'catering/inquiry/:merchantSlug'");
    expect(routeSource).toContain('catering-lead-form.component');
  });

  it('public catering routes are outside /app/ path (no auth guard)', () => {
    const lines = routeSource.split('\n');
    for (const route of ['catering/proposal', 'catering/portal', 'catering/inquiry']) {
      const lineIdx = lines.findIndex(l => l.includes(`'${route}`));
      expect(lineIdx).toBeGreaterThan(-1);
    }
  });
});
