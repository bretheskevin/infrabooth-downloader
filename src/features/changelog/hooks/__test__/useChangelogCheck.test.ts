import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChangelogCheck } from '../useChangelogCheck';
import { useChangelogStore } from '../../store';

// Mock @tauri-apps/api/app
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('1.6.0'),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
  }),
}));

// Mock CHANGELOG files
vi.mock('../../../../../CHANGELOG.md?raw', () => ({
  default: `## [1.6.0] - 2026-03-11\n\n### Added\n\n- New feature\n`,
}));

vi.mock('../../../../../CHANGELOG.fr.md?raw', () => ({
  default: `## [1.6.0] - 2026-03-11\n\n### Added\n\n- Nouvelle fonctionnalité\n`,
}));

describe('useChangelogCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useChangelogStore.setState({
      lastSeenVersion: null,
      cachedBody: null,
      cachedDate: null,
      _hasHydrated: true,
    });
  });

  it('should not show dialog on first install (lastSeenVersion is null)', async () => {
    const { result } = renderHook(() => useChangelogCheck());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(false);
    expect(useChangelogStore.getState().lastSeenVersion).toBe('1.6.0');
  });

  it('should show dialog when version has changed', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: true });

    const { result } = renderHook(() => useChangelogCheck());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(true);
    expect(result.current.version).toBe('1.6.0');
  });

  it('should not show dialog when version matches', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.6.0', _hasHydrated: true });

    const { result } = renderHook(() => useChangelogCheck());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(false);
  });

  it('should use cachedBody when available', async () => {
    useChangelogStore.setState({
      lastSeenVersion: '1.5.0',
      cachedBody: '### Added\n\n- Cached feature\n',
      cachedDate: '2026-03-11',
      _hasHydrated: true,
    });

    const { result } = renderHook(() => useChangelogCheck());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(true);
    expect(result.current.sections.length).toBeGreaterThan(0);
    expect(result.current.sections[0]!.items[0]).toBe('Cached feature');
  });

  it('should fall back to bundled CHANGELOG.md when cachedBody is null', async () => {
    useChangelogStore.setState({
      lastSeenVersion: '1.5.0',
      cachedBody: null,
      _hasHydrated: true,
    });

    const { result } = renderHook(() => useChangelogCheck());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(true);
    expect(result.current.sections.length).toBeGreaterThan(0);
  });

  it('should dismiss and update lastSeenVersion', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: true });

    const { result } = renderHook(() => useChangelogCheck());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.showWhatsNew).toBe(false);
    expect(useChangelogStore.getState().lastSeenVersion).toBe('1.6.0');
  });

  it('should not check before hydration', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: false });

    const { result } = renderHook(() => useChangelogCheck());

    // Immediately after render, before hydration
    expect(result.current.showWhatsNew).toBe(false);
  });
});
