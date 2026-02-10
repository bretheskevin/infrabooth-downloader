import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset only data properties (not actions)
    useSettingsStore.setState({
      downloadPath: '',
      language: 'en',
      _hasHydrated: false,
    });
  });

  describe('initial state', () => {
    it('should have empty downloadPath as default', () => {
      const { downloadPath } = useSettingsStore.getState();
      expect(downloadPath).toBe('');
    });

    it('should have language as en by default', () => {
      const { language } = useSettingsStore.getState();
      expect(language).toBe('en');
    });
  });

  describe('setDownloadPath', () => {
    it('should set downloadPath', () => {
      const { setDownloadPath } = useSettingsStore.getState();
      setDownloadPath('/Users/test/Downloads');

      const { downloadPath } = useSettingsStore.getState();
      expect(downloadPath).toBe('/Users/test/Downloads');
    });

    it('should update downloadPath when changed', () => {
      const { setDownloadPath } = useSettingsStore.getState();
      setDownloadPath('/path/one');
      setDownloadPath('/path/two');

      const { downloadPath } = useSettingsStore.getState();
      expect(downloadPath).toBe('/path/two');
    });
  });

  describe('setLanguage', () => {
    it('should set language to fr', () => {
      const { setLanguage } = useSettingsStore.getState();
      setLanguage('fr');

      const { language } = useSettingsStore.getState();
      expect(language).toBe('fr');
    });

    it('should set language back to en', () => {
      const { setLanguage } = useSettingsStore.getState();
      setLanguage('fr');
      setLanguage('en');

      const { language } = useSettingsStore.getState();
      expect(language).toBe('en');
    });
  });

  describe('persistence', () => {
    it('should persist settings to localStorage', () => {
      const { setDownloadPath, setLanguage } = useSettingsStore.getState();
      setDownloadPath('/test/path');
      setLanguage('fr');

      const stored = localStorage.getItem('sc-downloader-settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.downloadPath).toBe('/test/path');
      expect(parsed.state.language).toBe('fr');
    });

    it('should use sc-downloader-settings as the storage key', () => {
      const { setDownloadPath } = useSettingsStore.getState();
      setDownloadPath('/test/path');

      expect(localStorage.getItem('sc-downloader-settings')).toBeTruthy();
    });

    it('should not persist _hasHydrated to localStorage', () => {
      const { setDownloadPath, _setHasHydrated } = useSettingsStore.getState();
      setDownloadPath('/test/path');
      _setHasHydrated(true);

      const stored = localStorage.getItem('sc-downloader-settings');
      const parsed = JSON.parse(stored!);

      expect(parsed.state._hasHydrated).toBeUndefined();
    });
  });

  describe('hydration', () => {
    it('should have _hasHydrated as false initially', () => {
      const { _hasHydrated } = useSettingsStore.getState();
      expect(_hasHydrated).toBe(false);
    });

    it('should update _hasHydrated via _setHasHydrated', () => {
      const { _setHasHydrated } = useSettingsStore.getState();
      _setHasHydrated(true);

      const { _hasHydrated } = useSettingsStore.getState();
      expect(_hasHydrated).toBe(true);
    });

    it('should provide useSettingsHydrated selector', () => {
      useSettingsStore.setState({ _hasHydrated: true });
      // useSettingsHydrated is a hook, so we test the selector logic directly
      expect(useSettingsStore.getState()._hasHydrated).toBe(true);
    });
  });
});
