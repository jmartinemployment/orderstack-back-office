import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutService, CheckoutMode } from '../../services/checkout';
import { PaymentTerminal } from '../../shared/payment-terminal/payment-terminal';
import { WEIGHT_UNIT_LABELS } from '../../models/index';

@Component({
  selector: 'os-checkout',
  imports: [CurrencyPipe, FormsModule, PaymentTerminal],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout {
  readonly checkout = inject(CheckoutService);
  readonly mode = input.required<CheckoutMode>();
  readonly orderSource = input.required<string>();
  readonly completed = output<void>();
  readonly cancelled = output<void>();

  readonly weightUnitLabels = WEIGHT_UNIT_LABELS;
}
