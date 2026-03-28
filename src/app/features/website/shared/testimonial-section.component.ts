import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnDestroy,
  afterNextRender,
} from '@angular/core';
import { TestimonialCardComponent } from './testimonial-card.component';
import { TESTIMONIALS_HEADER, TESTIMONIALS } from '../marketing.config';

@Component({
  selector: 'os-testimonial-section',
  standalone: true,
  imports: [TestimonialCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonial-section.component.html',
  styleUrl: './testimonial-section.component.scss',
})
export class TestimonialSectionComponent implements OnDestroy {
  readonly header = TESTIMONIALS_HEADER;
  readonly testimonials = TESTIMONIALS;
  readonly activeIndex = signal(0);
  readonly trackOffset = computed(() => `translateX(-${this.activeIndex() * 100}%)`);

  private autoInterval: ReturnType<typeof setInterval> | null = null;
  private pointerStartX = 0;
  private pointerActive = false;

  constructor() {
    afterNextRender(() => {
      this.startAutoAdvance();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoAdvance();
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.restartAutoAdvance();
  }

  next(): void {
    this.activeIndex.set((this.activeIndex() + 1) % this.testimonials.length);
  }

  prev(): void {
    this.activeIndex.set(
      (this.activeIndex() - 1 + this.testimonials.length) % this.testimonials.length,
    );
  }

  onPointerDown(event: PointerEvent): void {
    this.pointerStartX = event.clientX;
    this.pointerActive = true;
    this.stopAutoAdvance();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointerActive) return;
    // Prevent text selection during swipe
    event.preventDefault();
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.pointerActive) return;
    this.pointerActive = false;
    const deltaX = event.clientX - this.pointerStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        this.next();
      } else {
        this.prev();
      }
    }
    this.startAutoAdvance();
  }

  onMouseEnter(): void {
    this.stopAutoAdvance();
  }

  onMouseLeave(): void {
    if (!this.pointerActive) {
      this.startAutoAdvance();
    }
  }

  private startAutoAdvance(): void {
    this.stopAutoAdvance();
    this.autoInterval = setInterval(() => this.next(), 6000);
  }

  private stopAutoAdvance(): void {
    if (this.autoInterval !== null) {
      clearInterval(this.autoInterval);
      this.autoInterval = null;
    }
  }

  private restartAutoAdvance(): void {
    this.stopAutoAdvance();
    this.startAutoAdvance();
  }
}
