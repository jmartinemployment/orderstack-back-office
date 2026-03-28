import '../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { LoadingSpinner } from './loading-spinner';

describe('LoadingSpinner', () => {
  let fixture: ComponentFixture<LoadingSpinner>;
  let component: LoadingSpinner;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoadingSpinner],
    });
    fixture = TestBed.createComponent(LoadingSpinner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders spinner with default size md', () => {
    const spinner = fixture.nativeElement.querySelector('.spinner-border');
    expect(spinner).toBeTruthy();
    expect(spinner.classList.contains('spinner-border-sm')).toBe(false);
  });

  it('renders sm spinner when size is sm', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner-border');
    expect(spinner.classList.contains('spinner-border-sm')).toBe(true);
  });

  it('shows message when provided', () => {
    fixture.componentRef.setInput('message', 'Loading data...');
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('p');
    expect(msg).toBeTruthy();
    expect(msg.textContent).toContain('Loading data...');
  });

  it('hides message when empty', () => {
    const msg = fixture.nativeElement.querySelector('p');
    expect(msg).toBeNull();
  });

  it('uses native output element for status', () => {
    const output = fixture.nativeElement.querySelector('output');
    expect(output).toBeTruthy();
  });

  it('has visually-hidden loading text', () => {
    const hidden = fixture.nativeElement.querySelector('.visually-hidden');
    expect(hidden.textContent).toBe('Loading...');
  });
});
