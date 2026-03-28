import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BUG-31: Broken images on landing page (logo carousel).
 *
 * Root cause: src/assets/logos/ directory was not included in the Angular
 * build assets configuration (angular.json). Only public/ was listed.
 * All 8 SVG logos referenced by PARTNER_LOGOS existed on disk but were
 * never copied to the build output, causing 404s at runtime.
 *
 * Fix: Added src/assets to the angular.json assets array with
 * output mapped to "assets".
 */

const angularJson = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../angular.json'), 'utf-8')
);

const componentSource = readFileSync(resolve(__dirname, 'logo-carousel.component.ts'), 'utf-8');

describe('logo-carousel — asset configuration (BUG-31)', () => {
  it('angular.json assets includes src/assets directory', () => {
    const buildOptions = angularJson.projects['orderstack-app'].architect.build.options;
    const assetsArray = buildOptions.assets;
    const srcAssetsEntry = assetsArray.find(
      (a: { input?: string }) => typeof a === 'object' && a.input === 'src/assets'
    );
    expect(srcAssetsEntry, 'src/assets should be in angular.json assets').toBeTruthy();
    expect(srcAssetsEntry.output).toBe('assets');
  });

  it('angular.json assets also includes public directory', () => {
    const buildOptions = angularJson.projects['orderstack-app'].architect.build.options;
    const assetsArray = buildOptions.assets;
    const publicEntry = assetsArray.find(
      (a: { input?: string }) => typeof a === 'object' && a.input === 'public'
    );
    expect(publicEntry).toBeTruthy();
  });
});

describe('logo-carousel — SVG files exist on disk (BUG-31)', () => {
  const { existsSync } = require('node:fs');
  const logosDir = resolve(__dirname, '../../../../assets/logos');

  const requiredLogos = [
    'doordash.svg',
    'uber.svg',
    'star.svg',
    'paypal.svg',
    'google.svg',
    'quickbooks.svg',
    'xero.svg',
  ];

  for (const logo of requiredLogos) {
    it(`${logo} exists in src/assets/logos/`, () => {
      expect(existsSync(resolve(logosDir, logo)), `${logo} should exist`).toBe(true);
    });
  }
});

describe('logo-carousel — component uses PARTNER_LOGOS (BUG-31)', () => {
  it('imports PARTNER_LOGOS from marketing config', () => {
    expect(componentSource).toContain("import { PARTNER_LOGOS } from '../marketing.config'");
  });

  it('uses [src]="logo.imageUrl" binding', () => {
    expect(componentSource).toContain('[src]="logo.imageUrl"');
  });

  it('uses [alt]="logo.name" for accessibility', () => {
    expect(componentSource).toContain('[alt]="logo.name"');
  });

  it('uses loading="lazy" for performance', () => {
    expect(componentSource).toContain('loading="lazy"');
  });
});
