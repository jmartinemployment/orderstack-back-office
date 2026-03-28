import { describe, it, expect } from 'vitest';
import {
  CONTACT_HERO,
  CONTACT_INFO,
  CONTACT_THANK_YOU,
  CONTACT_FORM_LABELS,
  CONTACT_VALIDATION,
  INQUIRY_TYPES,
} from '../../marketing.config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(fields: {
  name: string;
  email: string;
  inquiryType: string;
  message: string;
}): boolean {
  return (
    fields.name.trim().length >= 2 &&
    EMAIL_RE.exec(fields.email) !== null &&
    fields.inquiryType !== '' &&
    fields.message.trim().length >= 10
  );
}

function getNameError(name: string): string | null {
  return name.trim().length < 2 ? CONTACT_VALIDATION.nameMin : null;
}

function getEmailError(email: string): string | null {
  return EMAIL_RE.exec(email) === null ? CONTACT_VALIDATION.emailInvalid : null;
}

function getInquiryError(type: string): string | null {
  return type ? null : CONTACT_VALIDATION.inquiryRequired;
}

function getMessageError(message: string): string | null {
  return message.trim().length < 10 ? CONTACT_VALIDATION.messageMin : null;
}

describe('ContactPage — form validation', () => {
  it('empty form is invalid', () => {
    expect(validateForm({ name: '', email: '', inquiryType: '', message: '' })).toBe(false);
  });

  it('all required fields valid makes form valid', () => {
    expect(
      validateForm({
        name: 'Maria Gonzalez',
        email: 'maria@kitchen.com',
        inquiryType: 'demo_request',
        message: 'I want to see a demo of OrderStack for my restaurant.',
      }),
    ).toBe(true);
  });

  it('invalid email fails validation', () => {
    expect(getEmailError('not-an-email')).toBe(CONTACT_VALIDATION.emailInvalid);
    expect(getEmailError('bad@')).toBe(CONTACT_VALIDATION.emailInvalid);
  });

  it('valid email passes validation', () => {
    expect(getEmailError('test@example.com')).toBeNull();
  });

  it('short name fails validation', () => {
    expect(getNameError('A')).toBe(CONTACT_VALIDATION.nameMin);
    expect(getNameError(' ')).toBe(CONTACT_VALIDATION.nameMin);
  });

  it('valid name passes validation', () => {
    expect(getNameError('Jo')).toBeNull();
    expect(getNameError('Maria Gonzalez')).toBeNull();
  });

  it('empty inquiry type fails validation', () => {
    expect(getInquiryError('')).toBe(CONTACT_VALIDATION.inquiryRequired);
  });

  it('selected inquiry type passes validation', () => {
    expect(getInquiryError('demo_request')).toBeNull();
    expect(getInquiryError('general')).toBeNull();
  });

  it('short message fails validation', () => {
    expect(getMessageError('Hi')).toBe(CONTACT_VALIDATION.messageMin);
    expect(getMessageError('Short msg')).toBe(CONTACT_VALIDATION.messageMin);
  });

  it('valid message passes validation', () => {
    expect(getMessageError('I would like to schedule a demo please.')).toBeNull();
  });

  it('thank you title personalizes with first name', () => {
    const title = CONTACT_THANK_YOU.title.replaceAll('{name}', 'Maria');
    expect(title).toContain('Maria');
    expect(title).not.toContain('{name}');
  });

  it('inquiry types include demo_request option', () => {
    const demoOption = INQUIRY_TYPES.find(t => t.value === 'demo_request');
    expect(demoOption).toBeTruthy();
    expect(demoOption!.label).toBe('Request a Demo');
  });

  it('first inquiry type is empty placeholder', () => {
    expect(INQUIRY_TYPES[0].value).toBe('');
    expect(INQUIRY_TYPES[0].label).toContain('Select');
  });

  it('config constants are populated', () => {
    expect(CONTACT_HERO.title).toBeTruthy();
    expect(CONTACT_INFO.email).toContain('@');
    expect(CONTACT_FORM_LABELS.submit).toBeTruthy();
    expect(CONTACT_THANK_YOU.steps.length).toBeGreaterThanOrEqual(2);
  });
});
