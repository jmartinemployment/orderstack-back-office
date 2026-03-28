import '../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorDisplay } from './error-display';

describe('ErrorDisplay', () => {
  let fixture: ComponentFixture<ErrorDisplay>;
  let component: ErrorDisplay;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ErrorDisplay] });
    fixture = TestBed.createComponent(ErrorDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders default title and message', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('strong')?.textContent).toBe('Error');
    expect(el.querySelector('p')?.textContent).toBe('An error occurred');
  });

  it('renders custom title and message', () => {
    fixture.componentRef.setInput('title', 'Network Error');
    fixture.componentRef.setInput('message', 'Server unreachable');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('strong')?.textContent).toBe('Network Error');
    expect(el.querySelector('p')?.textContent).toBe('Server unreachable');
  });

  it('shows dismiss button by default', () => {
    expect(fixture.nativeElement.querySelector('.btn-close')).toBeTruthy();
  });

  it('hides dismiss button when not dismissible', () => {
    fixture.componentRef.setInput('dismissible', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-close')).toBeNull();
  });

  it('hides retry button by default', () => {
    expect(fixture.nativeElement.querySelector('.btn-outline-danger')).toBeNull();
  });

  it('shows retry button when retryable', () => {
    fixture.componentRef.setInput('retryable', true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-outline-danger');
    expect(btn).toBeTruthy();
    expect(btn.textContent.trim()).toBe('Retry');
  });

  it('emits dismissed on close click', () => {
    let emitted = false;
    component.dismissed.subscribe(() => emitted = true);
    fixture.nativeElement.querySelector('.btn-close').click();
    expect(emitted).toBe(true);
  });

  it('emits retry on retry click', () => {
    fixture.componentRef.setInput('retryable', true);
    fixture.detectChanges();
    let emitted = false;
    component.retry.subscribe(() => emitted = true);
    fixture.nativeElement.querySelector('.btn-outline-danger').click();
    expect(emitted).toBe(true);
  });

  it('has alert role for accessibility', () => {
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('has aria-label on close button', () => {
    const btn = fixture.nativeElement.querySelector('.btn-close');
    expect(btn.getAttribute('aria-label')).toBe('Close');
  });
});
