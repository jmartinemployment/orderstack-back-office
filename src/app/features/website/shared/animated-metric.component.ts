import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  ElementRef,
  afterNextRender,
  OnDestroy,
  inject,
} from '@angular/core';
import { MetricHighlight } from '../marketing.config';

@Component({
  selector: 'os-animated-metric',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-metric">
      <i [class]="'bi ' + metric().icon" aria-hidden="true"></i>
      <span class="mkt-metric__value">{{ metric().prefix }}{{ displayValue() }}{{ metric().suffix }}</span>
      <span class="mkt-metric__label">{{ metric().label }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      text-align: center;
    }

    .mkt-metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    i {
      font-size: 1.5rem;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 4px;
    }

    .mkt-metric__value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #fff;
      line-height: 1;

      @media (max-width: 767.98px) {
        font-size: 2rem;
      }
    }

    .mkt-metric__label {
      font-size: 0.8125rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `],
})
export class AnimatedMetricComponent implements OnDestroy {
  readonly metric = input.required<MetricHighlight>();
  readonly displayValue = signal(0);

  private readonly el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;
  private animFrameId = 0;

  constructor() {
    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this.animate();
            this.observer?.disconnect();
            this.observer = null;
          }
        },
        { threshold: 0.3 },
      );
      this.observer.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private animate(): void {
    const target = this.metric().value;
    if (target === 0) {
      this.displayValue.set(0);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayValue.set(Math.round(target * eased));

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }
}
