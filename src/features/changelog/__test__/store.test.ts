import { describe, it, expect, beforeEach } from 'vitest';
import { useChangelogStore } from '../store';

describe('changelogStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChangelogStore.setState({
      lastSeenVersion: null,
      cachedBody: null,
      cachedDate: null,
      _hasHydrated: false,
    });
  });

  describe('initial state', () => {
    it('should have lastSeenVersion as null', () => {
      expect(useChangelogStore.getState().lastSeenVersion).toBeNull();
    });

    it('should have cachedBody as null', () => {
      expect(useChangelogStore.getState().cachedBody).toBeNull();
    });

    it('should have cachedDate as null', () => {
      expect(useChangelogStore.getState().cachedDate).toBeNull();
    });
  });

  describe('setLastSeenVersion', () => {
    it('should set lastSeenVersion', () => {
      useChangelogStore.getState().setLastSeenVersion('1.6.0');
      expect(useChangelogStore.getState().lastSeenVersion).toBe('1.6.0');
    });

    it('should update lastSeenVersion when changed', () => {
      useChangelogStore.getState().setLastSeenVersion('1.5.0');
      useChangelogStore.getState().setLastSeenVersion('1.6.0');
      expect(useChangelogStore.getState().lastSeenVersion).toBe('1.6.0');
    });
  });

  describe('cacheChangelog', () => {
    it('should cache body and date', () => {
      useChangelogStore.getState().cacheChangelog('Release notes', '2026-03-11');
      const state = useChangelogStore.getState();
      expect(state.cachedBody).toBe('Release notes');
      expect(state.cachedDate).toBe('2026-03-11');
    });

    it('should accept null date', () => {
      useChangelogStore.getState().cacheChangelog('Notes', null);
      expect(useChangelogStore.getState().cachedDate).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should persist to localStorage', () => {
      useChangelogStore.getState().setLastSeenVersion('1.6.0');
      const stored = localStorage.getItem('sc-downloader-changelog');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.state.lastSeenVersion).toBe('1.6.0');
    });

    it('should not persist _hasHydrated', () => {
      useChangelogStore.getState().setLastSeenVersion('1.6.0');
      useChangelogStore.getState()._setHasHydrated(true);
      const stored = localStorage.getItem('sc-downloader-changelog');
      const parsed = JSON.parse(stored!);
      expect(parsed.state._hasHydrated).toBeUndefined();
    });

    it('should not persist cachedBody or cachedDate', () => {
      useChangelogStore.getState().cacheChangelog('Release notes', '2026-03-11');
      const stored = localStorage.getItem('sc-downloader-changelog');
      const parsed = JSON.parse(stored!);
      expect(parsed.state.cachedBody).toBeUndefined();
      expect(parsed.state.cachedDate).toBeUndefined();
    });
  });

  describe('hydration', () => {
    it('should have _hasHydrated as false initially', () => {
      expect(useChangelogStore.getState()._hasHydrated).toBe(false);
    });

    it('should update _hasHydrated via _setHasHydrated', () => {
      useChangelogStore.getState()._setHasHydrated(true);
      expect(useChangelogStore.getState()._hasHydrated).toBe(true);
    });
  });
});
