import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import {
  CONTACT_HERO,
  INQUIRY_TYPES,
  CONTACT_INFO,
  CONTACT_THANK_YOU,
  CONTACT_FORM_LABELS,
  CONTACT_VALIDATION,
} from '../../marketing.config';

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

@Component({
  selector: 'os-contact-page',
  standalone: true,
  imports: [
    RouterLink,
    MarketingSectionComponent,
    MarketingHeroComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactPageComponent implements OnInit {
  readonly hero = CONTACT_HERO;
  readonly inquiryTypes = INQUIRY_TYPES;
  readonly contactInfo = CONTACT_INFO;
  readonly thankYou = CONTACT_THANK_YOU;
  readonly labels = CONTACT_FORM_LABELS;
  readonly validation = CONTACT_VALIDATION;

  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoMetaService);

  // Form fields
  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly restaurantName = signal('');
  readonly inquiryType = signal('');
  readonly message = signal('');

  // Touched state
  readonly nameTouched = signal(false);
  readonly emailTouched = signal(false);
  readonly inquiryTypeTouched = signal(false);
  readonly messageTouched = signal(false);

  // Form state
  readonly submitting = signal(false);
  readonly submitted = signal(false);

  // Validation errors
  readonly nameError = computed(() =>
    this.nameTouched() && this.name().trim().length < 2 ? this.validation.nameMin : null,
  );
  readonly emailError = computed(() =>
    this.emailTouched() && EMAIL_RE.exec(this.email()) === null ? this.validation.emailInvalid : null,
  );
  readonly inquiryTypeError = computed(() =>
    this.inquiryTypeTouched() && !this.inquiryType() ? this.validation.inquiryRequired : null,
  );
  readonly messageError = computed(() =>
    this.messageTouched() && this.message().trim().length < 10 ? this.validation.messageMin : null,
  );

  readonly formValid = computed(() =>
    this.name().trim().length >= 2 &&
    EMAIL_RE.exec(this.email()) !== null &&
    this.inquiryType() !== '' &&
    this.message().trim().length >= 10,
  );

  readonly thankYouTitle = computed(() =>
    this.thankYou.title.replaceAll('{name}', this.name().trim().split(' ')[0] || 'there'),
  );

  ngOnInit(): void {
    this.seo.apply('contact');
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type && this.inquiryTypes.some(t => t.value === type)) {
      this.inquiryType.set(type);
    }
  }

  onFieldInput(field: 'name' | 'email' | 'phone' | 'restaurantName' | 'inquiryType' | 'message', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    this[field].set(value);
  }

  scrollToForm(): void {
    this.inquiryType.set('demo_request');
    const formEl = document.getElementById('contact-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.formValid() || this.submitting()) return;

    this.submitting.set(true);
    const payload = {
      name: this.name(),
      email: this.email(),
      phone: this.phone(),
      restaurantName: this.restaurantName(),
      inquiryType: this.inquiryType(),
      message: this.message(),
      source: 'contact_page',
      timestamp: new Date().toISOString(),
    };

    // Replace with actual API call when backend is ready
    // await fetch(`${environment.apiUrl}/api/leads`, { method: 'POST', body: JSON.stringify(payload) });
    console.log('[OrderStack Lead]', payload);

    await new Promise(resolve => setTimeout(resolve, 1500));
    this.submitted.set(true);
    this.submitting.set(false);
  }
}
