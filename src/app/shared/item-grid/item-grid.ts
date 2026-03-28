import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { MenuItem } from '../../models/index';

@Component({
  selector: 'os-item-grid',
  templateUrl: './item-grid.html',
  styleUrl: './item-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.color-mode]': 'tileMode() === "color"' },
})
export class ItemGrid {
  readonly items = input.required<MenuItem[]>();
  readonly isLoading = input(false);
  readonly tileMode = input<'image' | 'color'>('image');
  readonly categoryColorFn = input<(item: MenuItem) => string>();
  readonly itemImageFn = input<(item: MenuItem) => string | null>();

  readonly itemClick = output<MenuItem>();

  readonly placeholders = [1, 2, 3, 4, 5];

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const container = img.parentElement;
    if (container) {
      container.classList.add('item-image-placeholder');
    }
  }
}
