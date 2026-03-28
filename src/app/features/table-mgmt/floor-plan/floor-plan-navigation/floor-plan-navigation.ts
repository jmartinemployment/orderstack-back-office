import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

export type FloorPlanView = 'floor' | 'list';

@Component({
  selector: 'os-floor-plan-navigation',
  templateUrl: './floor-plan-navigation.html',
  styleUrl: './floor-plan-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanNavigation {
  readonly activeView = input.required<FloorPlanView>();
  readonly viewChange = output<FloorPlanView>();
}
