import { Component, ChangeDetectionStrategy, input, signal, computed, effect } from '@angular/core';
import { DemoFeatureCardComponent } from './demo-feature-card.component';
import { DemoBusinessType, DemoFeature, DEMO_FEATURES } from '../marketing.config';

@Component({
  selector: 'os-demo-feature-tour',
  standalone: true,
  imports: [DemoFeatureCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-feature-tour.component.html',
  styleUrl: './demo-feature-tour.component.scss',
})
export class DemoFeatureTourComponent {
  readonly businessType = input<DemoBusinessType>('restaurant');

  private readonly allFeatures = DEMO_FEATURES;
  private readonly _activeId = signal<string | null>(null);

  readonly visibleFeatures = computed(() =>
    this.allFeatures.filter(f => f.businessTypes.includes(this.businessType()))
  );

  readonly activeFeature = computed(() => {
    const visible = this.visibleFeatures();
    const id = this._activeId();
    return visible.find(f => f.id === id) ?? visible[0] ?? null;
  });

  constructor() {
    effect(() => {
      this.businessType();
      this._activeId.set(null);
    });
  }

  selectFeature(id: string): void {
    this._activeId.set(id);
  }

  isActive(feature: DemoFeature): boolean {
    return this.activeFeature()?.id === feature.id;
  }
}
