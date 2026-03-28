import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface StubInfo {
  icon: string;
  body: string;
}

const STUB_CONTENT: Record<string, StubInfo> = {
  'Business Info': {
    icon: 'bi-building',
    body: 'Set your legal business name, tax ID, and catering license details. Coming in a future update.',
  },
  'Invoice Branding': {
    icon: 'bi-palette',
    body: 'Upload your logo, set your brand color, and customize your invoice footer. Applies to all proposals, invoices, and BEOs.',
  },
  'Payment Setup': {
    icon: 'bi-credit-card',
    body: 'Connect a payment processor to accept client deposits and milestone payments online. Requires PayPal Commerce Platform.',
  },
  'Notifications': {
    icon: 'bi-bell',
    body: 'Configure email reminders for upcoming milestone payments and proposal expirations. Requires Resend email integration.',
  },
};

const DEFAULT_STUB: StubInfo = {
  icon: 'bi-gear',
  body: 'This feature is under development and will be available in a future update.',
};

@Component({
  selector: 'os-catering-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catering-stub.component.html',
  styleUrl: './catering-stub.component.scss',
  host: { style: 'display: block' },
})
export class CateringStubComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] ?? 'Coming Soon';
  readonly stub = STUB_CONTENT[this.title] ?? DEFAULT_STUB;
}
