import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguageSync } from './useLanguageSync';
import { useSettingsStore } from '@/stores/settingsStore';
import i18n from '@/lib/i18n';

describe('useLanguageSync', () => {
  beforeEach(() => {
    // Reset i18n to English
    i18n.changeLanguage('en');
    // Reset settings store to English
    act(() => {
      useSettingsStore.setState({ language: 'en' });
    });
  });

  it('should not change language when settings and i18n are in sync', () => {
    const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage');

    renderHook(() => useLanguageSync());

    // Should not call changeLanguage since both are 'en'
    expect(changeLanguageSpy).not.toHaveBeenCalled();

    changeLanguageSpy.mockRestore();
  });

  it('should sync i18n language when settings store language changes', async () => {
    const { rerender } = renderHook(() => useLanguageSync());

    expect(i18n.language).toBe('en');

    // Change settings store language
    act(() => {
      useSettingsStore.getState().setLanguage('fr');
    });

    rerender();

    // Wait for effect to run
    await vi.waitFor(() => {
      expect(i18n.language).toBe('fr');
    });
  });

  it('should change i18n to French when settings has French', async () => {
    // Set settings to French first
    act(() => {
      useSettingsStore.setState({ language: 'fr' });
    });

    renderHook(() => useLanguageSync());

    await vi.waitFor(() => {
      expect(i18n.language).toBe('fr');
    });
  });

  it('should react to multiple language changes', async () => {
    const { rerender } = renderHook(() => useLanguageSync());

    // Change to French
    act(() => {
      useSettingsStore.getState().setLanguage('fr');
    });
    rerender();

    await vi.waitFor(() => {
      expect(i18n.language).toBe('fr');
    });

    // Change back to English
    act(() => {
      useSettingsStore.getState().setLanguage('en');
    });
    rerender();

    await vi.waitFor(() => {
      expect(i18n.language).toBe('en');
    });
  });
});
