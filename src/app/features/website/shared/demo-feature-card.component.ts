import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DemoFeature } from '../marketing.config';

@Component({
  selector: 'os-demo-feature-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-feature-card.component.html',
  styleUrl: './demo-feature-card.component.scss',
})
export class DemoFeatureCardComponent {
  readonly feature = input.required<DemoFeature>();
}
