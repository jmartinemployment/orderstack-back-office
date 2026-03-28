import { describe, it, expect } from 'vitest';
import {
  ABOUT_HERO,
  ABOUT_MISSION,
  ABOUT_VALUES,
  ABOUT_LOCAL,
  CAREERS_HERO,
  CAREERS_EMPTY,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  SEO_CONFIGS,
} from '../../marketing.config';

describe('About & Company Pages — config validation', () => {
  // About
  it('about hero has tag, title, subtitle', () => {
    expect(ABOUT_HERO.tag).toBeTruthy();
    expect(ABOUT_HERO.title).toBeTruthy();
    expect(ABOUT_HERO.subtitle).toBeTruthy();
  });

  it('about mission has pull quote and paragraphs', () => {
    expect(ABOUT_MISSION.pullQuote.length).toBeGreaterThan(10);
    expect(ABOUT_MISSION.paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it('about values has 3 cards with icons', () => {
    expect(ABOUT_VALUES).toHaveLength(3);
    for (const card of ABOUT_VALUES) {
      expect(card.icon).toMatch(/^bi-/);
      expect(card.title).toBeTruthy();
      expect(card.description).toBeTruthy();
    }
  });

  it('about local section is populated', () => {
    expect(ABOUT_LOCAL.title).toBeTruthy();
    expect(ABOUT_LOCAL.description).toContain('Broward and Palm Beach County');
  });

  // Careers
  it('careers hero has tag and title', () => {
    expect(CAREERS_HERO.tag).toBe('Careers');
    expect(CAREERS_HERO.title).toBeTruthy();
  });

  it('careers empty state has email', () => {
    expect(CAREERS_EMPTY.email).toContain('@');
    expect(CAREERS_EMPTY.title).toBeTruthy();
    expect(CAREERS_EMPTY.description).toBeTruthy();
  });

  // Privacy
  it('privacy policy has lastUpdated and sections', () => {
    expect(PRIVACY_POLICY.lastUpdated).toBeTruthy();
    expect(PRIVACY_POLICY.sections.length).toBeGreaterThanOrEqual(8);
  });

  it('privacy sections have headings and paragraphs', () => {
    for (const section of PRIVACY_POLICY.sections) {
      expect(section.heading).toBeTruthy();
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(1);
    }
  });

  // Terms
  it('terms of service has lastUpdated and sections', () => {
    expect(TERMS_OF_SERVICE.lastUpdated).toBeTruthy();
    expect(TERMS_OF_SERVICE.sections.length).toBeGreaterThanOrEqual(10);
  });

  it('terms sections have headings and paragraphs', () => {
    for (const section of TERMS_OF_SERVICE.sections) {
      expect(section.heading).toBeTruthy();
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(1);
    }
  });

  // SEO
  it('SEO configs exist for all marketing pages', () => {
    const requiredPages = [
      'landing', 'pricing', 'demo', 'blog', 'integrations',
      'contact', 'privacy', 'terms', 'about', 'careers',
    ];
    for (const page of requiredPages) {
      expect(SEO_CONFIGS[page]).toBeTruthy();
      expect(SEO_CONFIGS[page].title).toBeTruthy();
      expect(SEO_CONFIGS[page].description).toBeTruthy();
      expect(SEO_CONFIGS[page].path).toBeTruthy();
    }
  });

  it('SEO config landing has root path', () => {
    expect(SEO_CONFIGS['landing'].path).toBe('/');
  });

  it('SEO description lengths are 50-200 chars', () => {
    for (const [, config] of Object.entries(SEO_CONFIGS)) {
      expect(config.description.length).toBeGreaterThanOrEqual(50);
      expect(config.description.length).toBeLessThanOrEqual(200);
    }
  });
});
