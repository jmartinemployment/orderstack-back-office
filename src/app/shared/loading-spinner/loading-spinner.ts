import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'os-loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinner {
  size = input<'sm' | 'md' | 'lg'>('md');
  color = input<string>('primary');
  message = input<string>('');
}
