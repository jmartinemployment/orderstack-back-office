import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'polling';

export interface OrderEvent {
  type: 'new' | 'updated' | 'cancelled' | 'printed' | 'print_failed';
  order: any;
}

export interface DeliveryLocationEvent {
  orderId: string;
  lat: number;
  lng: number;
  estimatedDeliveryAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly socketUrl = environment.socketUrl;

  private socket: Socket | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private _deviceType: 'pos' | 'kds' | 'sos' | undefined;

  // Private writable signals
  private readonly _connectionStatus = signal<SocketConnectionStatus>('disconnected');
  private readonly _deviceId = signal<string>(this.getOrCreateDeviceId());
  private readonly _lastOrderEvent = signal<OrderEvent | null>(null);

  // Public readonly signals
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly deviceId = this._deviceId.asReadonly();
  readonly lastOrderEvent = this._lastOrderEvent.asReadonly();

  // Browser online detection
  private readonly _browserOnline = signal(navigator.onLine);

  // Computed signals
  readonly isConnected = computed(() => this._connectionStatus() === 'connected');
  readonly isPolling = computed(() => this._connectionStatus() === 'polling');
  readonly isOnline = computed(() => this._browserOnline() && this.isConnected());

  // Delivery location
  private readonly _lastDeliveryLocation = signal<DeliveryLocationEvent | null>(null);
  readonly lastDeliveryLocation = this._lastDeliveryLocation.asReadonly();

  // Event callbacks
  private orderCallbacks: Array<(event: OrderEvent) => void> = [];
  private deliveryLocationCallbacks: Array<(event: DeliveryLocationEvent) => void> = [];
  private customEventHandlers: Array<{ eventName: string; callback: (data: any) => void }> = [];

  constructor() {
    globalThis.addEventListener('online', () => this._browserOnline.set(true));
    globalThis.addEventListener('offline', () => this._browserOnline.set(false));
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  connect(merchantId: string, deviceType?: 'pos' | 'kds' | 'sos'): void {
    if (deviceType) {
      this._deviceType = deviceType;
    }

    if (this.socket?.connected) {
      this.joinRestaurant(merchantId);
      return;
    }

    this._connectionStatus.set('connecting');

    this.socket = io(this.socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: this.authService.token(),
        deviceId: this._deviceId(),
        deviceType,
      },
    });

    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');
      this.reconnectAttempts = 0;
      this.joinRestaurant(merchantId);
      this.startHeartbeat();
      // Bind any custom event handlers registered before connect
      for (const handler of this.customEventHandlers) {
        this.socket!.on(handler.eventName, handler.callback);
      }
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
      this.stopHeartbeat();
      this.handleReconnect(merchantId);
    });

    this.socket.on('connect_error', () => {
      this._connectionStatus.set('disconnected');
      this.handleReconnect(merchantId);
    });

    this.socket.on('order:new', (data: any) => {
      const order = this.unwrapOrderPayload(data);
      const event: OrderEvent = { type: 'new', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('order:updated', (data: any) => {
      const order = this.unwrapOrderPayload(data);
      const event: OrderEvent = { type: 'updated', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('order:cancelled', (data: any) => {
      const order = this.unwrapOrderPayload(data);
      const event: OrderEvent = { type: 'cancelled', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('order:printed', (data: any) => {
      const order = this.unwrapOrderPayload(data);
      const event: OrderEvent = { type: 'printed', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('order:print_failed', (data: any) => {
      const order = this.unwrapOrderPayload(data);
      const event: OrderEvent = { type: 'print_failed', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('delivery:location_updated', (data: DeliveryLocationEvent) => {
      this._lastDeliveryLocation.set(data);
      for (const cb of this.deliveryLocationCallbacks) {
        cb(data);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopPolling();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this._connectionStatus.set('disconnected');
  }

  private joinRestaurant(merchantId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-restaurant', { merchantId });
    }
  }

  private handleReconnect(merchantId: string): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.startPolling();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      if (this._connectionStatus() === 'disconnected') {
        this.connect(merchantId, this._deviceType);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this._connectionStatus.set('polling');

    this.pollingInterval = setInterval(() => {
      // Polling is handled by OrderService
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  onOrderEvent(callback: (event: OrderEvent) => void): () => void {
    this.orderCallbacks.push(callback);
    return () => {
      this.orderCallbacks = this.orderCallbacks.filter(cb => cb !== callback);
    };
  }

  onCustomEvent(eventName: string, callback: (data: any) => void): () => void {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
    // Store for late-binding if socket not yet connected
    const handler = { eventName, callback };
    this.customEventHandlers.push(handler);
    return () => {
      this.customEventHandlers = this.customEventHandlers.filter(h => h !== handler);
      if (this.socket) {
        this.socket.off(eventName, callback);
      }
    };
  }

  onDeliveryLocationEvent(callback: (event: DeliveryLocationEvent) => void): () => void {
    this.deliveryLocationCallbacks.push(callback);
    return () => {
      this.deliveryLocationCallbacks = this.deliveryLocationCallbacks.filter(cb => cb !== callback);
    };
  }

  private unwrapOrderPayload(data: any): any {
    // Backend sends { order, timestamp } — unwrap to get the raw order
    return data?.order ?? data;
  }

  private notifyOrderCallbacks(event: OrderEvent): void {
    this.orderCallbacks.forEach(cb => cb(event));
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
