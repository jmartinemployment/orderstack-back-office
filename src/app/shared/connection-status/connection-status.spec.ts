import '../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { ConnectionStatus } from './connection-status';
import { SocketService } from '@services/socket';

describe('ConnectionStatus', () => {
  let fixture: ComponentFixture<ConnectionStatus>;
  let component: ConnectionStatus;
  const _connectionStatus = signal<string>('connected');
  const _isConnected = signal(true);
  const _isPolling = signal(false);

  beforeEach(() => {
    _connectionStatus.set('connected');
    _isConnected.set(true);
    _isPolling.set(false);

    TestBed.configureTestingModule({
      imports: [ConnectionStatus],
      providers: [
        { provide: SocketService, useValue: {
          connectionStatus: _connectionStatus.asReadonly(),
          isConnected: _isConnected.asReadonly(),
          isPolling: _isPolling.asReadonly(),
        }},
      ],
    });
    fixture = TestBed.createComponent(ConnectionStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows "Live" when connected', () => {
    expect(fixture.nativeElement.querySelector('.status-text').textContent.trim()).toBe('Live');
  });

  it('applies connected class to indicator', () => {
    expect(fixture.nativeElement.querySelector('.status-indicator.connected')).toBeTruthy();
  });

  it('shows "Polling" when polling', () => {
    _connectionStatus.set('polling');
    _isPolling.set(true);
    _isConnected.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-text').textContent.trim()).toBe('Polling');
    expect(fixture.nativeElement.querySelector('.status-indicator.polling')).toBeTruthy();
  });

  it('shows "Connecting..." when connecting', () => {
    _connectionStatus.set('connecting');
    _isConnected.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-text').textContent.trim()).toBe('Connecting...');
    expect(fixture.nativeElement.querySelector('.status-indicator.connecting')).toBeTruthy();
  });

  it('shows "Offline" when disconnected', () => {
    _connectionStatus.set('disconnected');
    _isConnected.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-text').textContent.trim()).toBe('Offline');
    expect(fixture.nativeElement.querySelector('.status-indicator.disconnected')).toBeTruthy();
  });
});
