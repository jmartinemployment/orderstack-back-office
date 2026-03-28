import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

export interface TopNavigationTab {
  key: string;
  label: string;
}

@Component({
  selector: 'os-top-navigation',
  templateUrl: './top-navigation.html',
  styleUrl: './top-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopNavigation {
  readonly tabs = input.required<TopNavigationTab[]>();
  readonly activeTab = input.required<string>();
  readonly tabChange = output<string>();
}
