import { Injectable, signal, OnDestroy } from '@angular/core';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 13 * 60 * 1000; // show warning at 13 minutes
const TICK_INTERVAL_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService implements OnDestroy {
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _activityListeners: Array<() => void> = [];
  private _lastActivity = 0;

  readonly showWarning = signal(false);
  readonly secondsRemaining = signal(0);

  private _onExpire: (() => void) | null = null;

  start(onExpire: () => void): void {
    this._onExpire = onExpire;
    this._resetTimer();
    this._attachListeners();
    this._startTick();
  }

  stop(): void {
    this._clearTimer();
    this._detachListeners();
    this.showWarning.set(false);
    this.secondsRemaining.set(0);
    this._onExpire = null;
  }

  extendSession(): void {
    this._resetTimer();
    this.showWarning.set(false);
  }

  private _resetTimer(): void {
    this._lastActivity = Date.now();
  }

  private _startTick(): void {
    this._clearTimer();
    this._timer = setInterval(() => {
      const elapsed = Date.now() - this._lastActivity;
      const remaining = Math.max(0, TIMEOUT_MS - elapsed);

      if (elapsed >= TIMEOUT_MS) {
        this.showWarning.set(false);
        this.secondsRemaining.set(0);
        this.stop();
        this._onExpire?.();
        return;
      }

      if (elapsed >= WARNING_MS) {
        this.showWarning.set(true);
        this.secondsRemaining.set(Math.ceil(remaining / 1000));
      } else {
        this.showWarning.set(false);
      }
    }, TICK_INTERVAL_MS);
  }

  private _clearTimer(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private _attachListeners(): void {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    for (const event of events) {
      const listener = () => this._resetTimer();
      this._activityListeners.push(listener);
      globalThis.addEventListener(event, listener, { passive: true });
    }
  }

  private _detachListeners(): void {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    this._activityListeners.forEach((listener, i) => {
      globalThis.removeEventListener(events[i], listener);
    });
    this._activityListeners = [];
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
