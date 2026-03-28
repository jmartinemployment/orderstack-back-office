import { Component, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CustomerDisplayMode, CustomerDisplayMessage } from '../../../models/index';

interface DisplayItem {
  name: string;
  quantity: number;
  price: number;
}

@Component({
  selector: 'os-customer-display',
  imports: [CurrencyPipe],
  templateUrl: './customer-display.html',
  styleUrl: './customer-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDisplay implements OnInit, OnDestroy {
  private channel: BroadcastChannel | null = null;

  private readonly _mode = signal<CustomerDisplayMode>('idle');
  private readonly _items = signal<DisplayItem[]>([]);
  private readonly _subtotal = signal(0);
  private readonly _tax = signal(0);
  private readonly _total = signal(0);
  private readonly _tipPresets = signal<number[]>([15, 18, 20, 25]);
  private readonly _selectedTip = signal<number | null>(null);
  private readonly _brandingMessage = signal('Thank you for your visit!');
  private readonly _slideshowImages = signal<string[]>([]);
  private readonly _slideshowInterval = signal(8);
  private readonly _currentSlideIndex = signal(0);
  private slideshowTimer: ReturnType<typeof setInterval> | null = null;

  readonly mode = this._mode.asReadonly();
  readonly items = this._items.asReadonly();
  readonly subtotal = this._subtotal.asReadonly();
  readonly tax = this._tax.asReadonly();
  readonly total = this._total.asReadonly();
  readonly tipPresets = this._tipPresets.asReadonly();
  readonly selectedTip = this._selectedTip.asReadonly();
  readonly brandingMessage = this._brandingMessage.asReadonly();
  readonly slideshowImages = this._slideshowImages.asReadonly();
  readonly currentSlideIndex = this._currentSlideIndex.asReadonly();

  readonly currentSlideImage = computed(() => {
    const images = this._slideshowImages();
    const idx = this._currentSlideIndex();
    return images.length > 0 ? images[idx % images.length] : null;
  });

  readonly tipAmount = computed(() => {
    const tip = this._selectedTip();
    if (tip === null) return 0;
    return this._subtotal() * (tip / 100);
  });

  readonly grandTotal = computed(() => this._total() + this.tipAmount());

  ngOnInit(): void {
    this.channel = new BroadcastChannel('orderstack-customer-display');
    this.channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      this.handleMessage(event.data);
    };
  }

  ngOnDestroy(): void {
    this.channel?.close();
    this.stopSlideshow();
  }

  private handleMessage(msg: CustomerDisplayMessage): void {
    switch (msg.type) {
      case 'item-added':
      case 'item-removed':
      case 'totals-updated':
        this._mode.set('active');
        if (msg.items) this._items.set(msg.items);
        if (msg.subtotal !== undefined) this._subtotal.set(msg.subtotal);
        if (msg.tax !== undefined) this._tax.set(msg.tax);
        if (msg.total !== undefined) this._total.set(msg.total);
        this.stopSlideshow();
        break;

      case 'tip-prompt':
        this._mode.set('tip');
        if (msg.tipPresets) this._tipPresets.set(msg.tipPresets);
        this._selectedTip.set(null);
        break;

      case 'payment-complete':
        this._mode.set('complete');
        if (msg.brandingMessage) this._brandingMessage.set(msg.brandingMessage);
        setTimeout(() => {
          this._mode.set('idle');
          this._items.set([]);
          this._subtotal.set(0);
          this._tax.set(0);
          this._total.set(0);
          this._selectedTip.set(null);
          this.startSlideshow();
        }, 5000);
        break;

      case 'reset':
        this._mode.set('idle');
        this._items.set([]);
        this._subtotal.set(0);
        this._tax.set(0);
        this._total.set(0);
        this._selectedTip.set(null);
        this.startSlideshow();
        break;
    }
  }

  selectTip(percent: number): void {
    this._selectedTip.set(percent);
    this.channel?.postMessage({ type: 'tip-selected', tipPercent: percent });
  }

  selectNoTip(): void {
    this._selectedTip.set(0);
    this.channel?.postMessage({ type: 'tip-selected', tipPercent: 0 });
  }

  private startSlideshow(): void {
    this.stopSlideshow();
    const images = this._slideshowImages();
    if (images.length < 2) return;
    this.slideshowTimer = setInterval(() => {
      this._currentSlideIndex.update(i => (i + 1) % images.length);
    }, this._slideshowInterval() * 1000);
  }

  private stopSlideshow(): void {
    if (this.slideshowTimer) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = null;
    }
  }
}
