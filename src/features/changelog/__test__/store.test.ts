import { describe, it, expect, beforeEach } from 'vitest';
import { useChangelogStore } from '../store';

describe('changelogStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChangelogStore.setState({
      lastSeenVersion: null,
      _hasHydrated: false,
    });
  });

  describe('initial state', () => {
    it('should have lastSeenVersion as null', () => {
      expect(useChangelogStore.getState().lastSeenVersion).toBeNull();
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
