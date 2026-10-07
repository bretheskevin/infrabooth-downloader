import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getVersion } from '@tauri-apps/api/app';
import { useChangelogCheck } from '../useChangelogCheck';
import { useChangelogStore } from '../../store';

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../../../../CHANGELOG.md?raw', () => ({
  default: [
    '## [1.6.0] - 2026-03-11\n\n### Added\n\n- New feature\n',
    '## [1.5.1] - 2026-03-05\n',
    '## [1.5.0] - 2026-03-01\n\n### Fixed\n\n- Bug fix\n',
    '## [1.4.0] - 2026-02-20\n\n### Added\n\n- Old feature\n',
  ].join('\n'),
}));

vi.mock('../../../../../CHANGELOG.fr.md?raw', () => ({
  default: [
    '## [1.6.0] - 2026-03-11\n\n### Added\n\n- Nouvelle fonctionnalité\n',
    '## [1.5.1] - 2026-03-05\n',
    '## [1.5.0] - 2026-03-01\n\n### Fixed\n\n- Correction\n',
    '## [1.4.0] - 2026-02-20\n\n### Added\n\n- Ancienne fonctionnalité\n',
  ].join('\n'),
}));

async function renderChecked() {
  const hook = renderHook(() => useChangelogCheck());
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  return hook;
}

describe('useChangelogCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getVersion).mockResolvedValue('1.6.0');
    localStorage.clear();
    useChangelogStore.setState({ lastSeenVersion: null, _hasHydrated: true });
  });

  it('does not show the dialog on first install and stores the current version', async () => {
    const { result } = await renderChecked();

    expect(result.current.showWhatsNew).toBe(false);
    expect(useChangelogStore.getState().lastSeenVersion).toBe('1.6.0');
  });

  it('does not show the dialog when the version is unchanged', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.6.0', _hasHydrated: true });

    const { result } = await renderChecked();

    expect(result.current.showWhatsNew).toBe(false);
  });

  it('shows the single missed version on a one-version jump, hiding versions without notes', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: true });

    const { result } = await renderChecked();

    expect(result.current.showWhatsNew).toBe(true);
    expect(result.current.previousVersion).toBe('1.5.0');
    expect(result.current.entries.map((e) => e.version)).toEqual(['1.6.0']);
    expect(result.current.entries[0]?.sections).toEqual([{ category: 'added', items: ['New feature'] }]);
  });

  it('shows every missed version newest first on a multi-version jump', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.3.0', _hasHydrated: true });

    const { result } = await renderChecked();

    expect(result.current.showWhatsNew).toBe(true);
    expect(result.current.previousVersion).toBe('1.3.0');
    expect(result.current.entries.map((e) => e.version)).toEqual(['1.6.0', '1.5.0', '1.4.0']);
  });

  it('does not show the dialog on downgrade and leaves lastSeenVersion unchanged', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.7.0', _hasHydrated: true });

    const { result } = await renderChecked();

    expect(result.current.showWhatsNew).toBe(false);
    expect(result.current.entries).toEqual([]);
    expect(useChangelogStore.getState().lastSeenVersion).toBe('1.7.0');
  });

  it('does not show the dialog when no missed version has notes and stores the current version', async () => {
    vi.mocked(getVersion).mockResolvedValue('1.5.1');
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: true });

    const { result } = await renderChecked();

    expect(result.current.showWhatsNew).toBe(false);
    expect(result.current.entries).toEqual([]);
    expect(useChangelogStore.getState().lastSeenVersion).toBe('1.5.1');
  });

  it('dismisses and stores the current version while keeping previousVersion', async () => {
    useChangelogStore.setState({ lastSeenVersion: '1.3.0', _hasHydrated: true });

    const { result } = await renderChecked();
    expect(result.current.showWhatsNew).toBe(true);

    await act(async () => {
      result.current.dismiss();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.showWhatsNew).toBe(false);
    expect(useChangelogStore.getState().lastSeenVersion).toBe('1.6.0');
    expect(result.current.previousVersion).toBe('1.3.0');
  });

  it('does not check before hydration', () => {
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: false });

    const { result } = renderHook(() => useChangelogCheck());

    expect(result.current.showWhatsNew).toBe(false);
    expect(getVersion).not.toHaveBeenCalled();
  });
});
