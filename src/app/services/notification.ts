import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly _toast = signal<Toast | null>(null);
  readonly toast = this._toast.asReadonly();

  show(message: string, durationMs = 4000): void {
    const id = crypto.randomUUID();
    this._toast.set({ id, message });
    setTimeout(() => {
      this._toast.update(t => (t?.id === id ? null : t));
    }, durationMs);
  }

  dismiss(): void {
    this._toast.set(null);
  }
}
