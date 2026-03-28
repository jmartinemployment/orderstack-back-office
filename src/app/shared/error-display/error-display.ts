import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'os-error-display',
  imports: [],
  templateUrl: './error-display.html',
  styleUrl: './error-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorDisplay {
  message = input<string>('An error occurred');
  title = input<string>('Error');
  dismissible = input<boolean>(true);
  retryable = input<boolean>(false);

  dismissed = output<void>();
  retry = output<void>();

  onDismiss(): void {
    this.dismissed.emit();
  }

  onRetry(): void {
    this.retry.emit();
  }
}
