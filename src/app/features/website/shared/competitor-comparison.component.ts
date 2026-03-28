import { Component, ChangeDetectionStrategy } from '@angular/core';
import { COMPETITOR_HEADER, COMPETITOR_ROWS } from '../marketing.config';

@Component({
  selector: 'os-competitor-comparison',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competitor-comparison.component.html',
  styleUrl: './competitor-comparison.component.scss',
})
export class CompetitorComparisonComponent {
  readonly header = COMPETITOR_HEADER;
  readonly rows = COMPETITOR_ROWS;

  isBoolean(value: string | boolean): value is boolean {
    return typeof value === 'boolean';
  }
}
