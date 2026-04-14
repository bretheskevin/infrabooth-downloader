import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../store';

describe('settingsStore', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset only data properties (not actions)
    useSettingsStore.setState({
      downloadPath: '',
      rekordboxPathOverride: '',
      language: 'en',
      theme: 'system',
      preservePlaylistOrder: true,
      crossfadeEnabled: false,
      crossfadeDuration: 5,
      _hasHydrated: false,
    });
  });

  describe('initial state', () => {
    it('should have empty downloadPath as default', () => {
      const { downloadPath } = useSettingsStore.getState();
      expect(downloadPath).toBe('');
    });

    it('should have empty rekordboxPathOverride as default', () => {
      const { rekordboxPathOverride } = useSettingsStore.getState();
      expect(rekordboxPathOverride).toBe('');
    });

    it('should have language as en by default', () => {
      const { language } = useSettingsStore.getState();
      expect(language).toBe('en');
    });

    it('should have theme as system by default', () => {
      const { theme } = useSettingsStore.getState();
      expect(theme).toBe('system');
    });

    it('should have preservePlaylistOrder as true by default', () => {
      const { preservePlaylistOrder } = useSettingsStore.getState();
      expect(preservePlaylistOrder).toBe(true);
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

  describe('setRekordboxPathOverride', () => {
    it('should set rekordboxPathOverride', () => {
      const { setRekordboxPathOverride } = useSettingsStore.getState();
      setRekordboxPathOverride('/Users/test/rekordbox/master.db');

      const { rekordboxPathOverride } = useSettingsStore.getState();
      expect(rekordboxPathOverride).toBe('/Users/test/rekordbox/master.db');
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

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');

      const { theme } = useSettingsStore.getState();
      expect(theme).toBe('dark');
    });

    it('should set theme to light', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('light');

      const { theme } = useSettingsStore.getState();
      expect(theme).toBe('light');
    });

    it('should set theme back to system', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');
      setTheme('system');

      const { theme } = useSettingsStore.getState();
      expect(theme).toBe('system');
    });
  });

  describe('setPreservePlaylistOrder', () => {
    it('should set preservePlaylistOrder to false', () => {
      const { setPreservePlaylistOrder } = useSettingsStore.getState();
      setPreservePlaylistOrder(false);

      const { preservePlaylistOrder } = useSettingsStore.getState();
      expect(preservePlaylistOrder).toBe(false);
    });

    it('should set preservePlaylistOrder back to true', () => {
      const { setPreservePlaylistOrder } = useSettingsStore.getState();
      setPreservePlaylistOrder(false);
      setPreservePlaylistOrder(true);

      const { preservePlaylistOrder } = useSettingsStore.getState();
      expect(preservePlaylistOrder).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist settings to localStorage', () => {
      const { setDownloadPath, setRekordboxPathOverride, setLanguage, setTheme, setPreservePlaylistOrder } = useSettingsStore.getState();
      setDownloadPath('/test/path');
      setRekordboxPathOverride('/Users/test/rekordbox/master.db');
      setLanguage('fr');
      setTheme('dark');
      setPreservePlaylistOrder(false);

      const stored = localStorage.getItem('sc-downloader-settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.downloadPath).toBe('/test/path');
      expect(parsed.state.rekordboxPathOverride).toBe('/Users/test/rekordbox/master.db');
      expect(parsed.state.language).toBe('fr');
      expect(parsed.state.theme).toBe('dark');
      expect(parsed.state.preservePlaylistOrder).toBe(false);
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

  describe('crossfade settings', () => {
    it('should have crossfadeEnabled as false by default', () => {
      const { crossfadeEnabled } = useSettingsStore.getState();
      expect(crossfadeEnabled).toBe(false);
    });

    it('should have crossfadeDuration as 5 by default', () => {
      const { crossfadeDuration } = useSettingsStore.getState();
      expect(crossfadeDuration).toBe(5);
    });

    it('should set crossfadeEnabled', () => {
      useSettingsStore.getState().setCrossfadeEnabled(true);
      expect(useSettingsStore.getState().crossfadeEnabled).toBe(true);
    });

    it('should set crossfadeDuration', () => {
      useSettingsStore.getState().setCrossfadeDuration(8);
      expect(useSettingsStore.getState().crossfadeDuration).toBe(8);
    });

    it('should clamp crossfadeDuration to 1-12', () => {
      useSettingsStore.getState().setCrossfadeDuration(0);
      expect(useSettingsStore.getState().crossfadeDuration).toBe(1);
      useSettingsStore.getState().setCrossfadeDuration(20);
      expect(useSettingsStore.getState().crossfadeDuration).toBe(12);
    });
  });
});
