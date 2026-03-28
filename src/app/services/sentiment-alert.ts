import { Injectable, signal, computed, effect, inject, untracked, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { AuthService } from './auth';
import { SocketService } from './socket';
import { environment } from '../environments/environment';
import type { OrderSentimentRecord, SentimentAlertEvent } from '../models/sentiment.model';

@Injectable({ providedIn: 'root' })
export class SentimentAlertService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _alerts = signal<OrderSentimentRecord[]>([]);
  private readonly _isLoading = signal(false);
  private unsubscribe: (() => void) | null = null;

  readonly alerts = this._alerts.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly unreadCount = computed(() => this._alerts().filter(a => !a.isRead).length);
  readonly criticalCount = computed(() =>
    this._alerts().filter(a => !a.isRead && a.urgency === 'critical').length
  );

  constructor() {
    effect(() => {
      const mid = this.authService.selectedMerchantId();
      if (mid) {
        untracked(() => this.loadAlerts());
        this.unsubscribe?.();
        this.unsubscribe = this.socketService.onCustomEvent(
          'sentiment_alert',
          (data: SentimentAlertEvent) => {
            this._alerts.update(list => {
              if (list.some(a => a.id === data.record.id)) return list;
              return [data.record, ...list];
            });
          }
        );
      }
    });
  }

  async loadAlerts(): Promise<void> {
    const mid = this.authService.selectedMerchantId();
    if (!mid) return;
    this._isLoading.set(true);
    try {
      const alerts = await firstValueFrom(
        this.http.get<OrderSentimentRecord[]>(
          `${this.apiUrl}/merchant/${mid}/alerts/sentiment`
        ).pipe(timeout(10_000))
      );
      this._alerts.set(alerts);
    } catch {
      // 404/500 — keep existing alerts, don't crash
    } finally {
      this._isLoading.set(false);
    }
  }

  async markRead(alertId: string): Promise<void> {
    const mid = this.authService.selectedMerchantId();
    if (!mid) return;
    try {
      await firstValueFrom(
        this.http.patch<{ success: boolean }>(
          `${this.apiUrl}/merchant/${mid}/alerts/sentiment/${alertId}/read`,
          {}
        )
      );
      this._alerts.update(list =>
        list.map(a => a.id === alertId ? { ...a, isRead: true } : a)
      );
    } catch {
      // failed — don't update local state
    }
  }

  async markAllRead(): Promise<void> {
    const mid = this.authService.selectedMerchantId();
    if (!mid) return;
    try {
      await firstValueFrom(
        this.http.patch<{ count: number }>(
          `${this.apiUrl}/merchant/${mid}/alerts/sentiment/read-all`,
          {}
        )
      );
      this._alerts.update(list =>
        list.map(a => ({ ...a, isRead: true }))
      );
    } catch {
      // failed — don't update local state
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
