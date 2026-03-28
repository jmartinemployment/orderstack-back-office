import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Order, getOrderIdentifier, getCustomerDisplayName } from '../../../models/index';

@Component({
  selector: 'os-receipt-printer',
  imports: [CurrencyPipe],
  templateUrl: './receipt-printer.html',
  styleUrl: './receipt-printer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptPrinter {
  order = input.required<Order>();
  restaurantName = input<string>('GetOrderStack Restaurant');
  restaurantAddress = input<string>('');
  restaurantPhone = input<string>('');
  showPrintButton = input<boolean>(true);

  private readonly _isPrinting = signal(false);
  readonly isPrinting = this._isPrinting.asReadonly();

  getOrderNumber(): string {
    return getOrderIdentifier(this.order());
  }

  getCustomerName(): string {
    return getCustomerDisplayName(this.order());
  }

  print(): void {
    this._isPrinting.set(true);

    setTimeout(() => {
      globalThis.print();
      this._isPrinting.set(false);
    }, 100);
  }

  getFormattedDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
