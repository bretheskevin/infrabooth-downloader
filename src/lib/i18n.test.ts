import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';

describe('i18n configuration', () => {
  beforeEach(() => {
    // Reset to default language before each test
    i18n.changeLanguage('en');
  });

  it('should initialize with English as default language', () => {
    expect(i18n.language).toBe('en');
  });

  it('should have English fallback language', () => {
    expect(i18n.options.fallbackLng).toContain('en');
  });

  it('should have English translations loaded', () => {
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
  });

  it('should have French translations loaded', () => {
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(true);
  });

  it('should translate app.title key correctly in English', () => {
    expect(i18n.t('app.title')).toBe('InfraBooth Downloader');
  });

  it('should change language to French', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');
  });

  it('should translate app.title key correctly in French', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('app.title')).toBe('InfraBooth Downloader');
  });

  it('should handle interpolation correctly', () => {
    expect(i18n.t('auth.signedInAs', { username: 'TestUser' })).toBe('Signed in as TestUser');
  });

  it('should handle interpolation in French', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('auth.signedInAs', { username: 'TestUser' })).toBe('TestUser');
  });

  it('should return key name for missing translations in development', () => {
    const result = i18n.t('nonexistent.key');
    expect(result).toBe('nonexistent.key');
  });

  it('should not escape values during interpolation', () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });
});
