import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type AlertSeverity = 'critical' | 'warning' | 'info' | null;

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  key?: string;
  badge?: number;
  alertSeverity?: AlertSeverity;
  children?: NavItem[];
  dividerBefore?: boolean;
  queryParams?: Record<string, string>;
  exact?: boolean;
}

@Component({
  selector: 'os-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sidebar-collapsed]': 'collapsed()',
  },
})
export class Sidebar {
  readonly navItems = input.required<NavItem[]>();
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly restaurantName = input<string | null>(null);
  readonly restaurantAddress = input<string | null>(null);
  readonly userName = input<string | null>(null);

  readonly toggled = output<void>();
  readonly closeMobile = output<void>();
  readonly loggedOut = output<void>();
}
