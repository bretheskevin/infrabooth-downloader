import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangelogDialog } from '../ChangelogDialog';
import { useChangelogStore } from '../../store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'changelog.title': 'Changelog',
        'changelog.description': 'Version history and release notes',
        'changelog.added': 'Added',
        'changelog.changed': 'Changed',
        'changelog.fixed': 'Fixed',
        'changelog.removed': 'Removed',
        'changelog.current': 'current',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock the CHANGELOG.md import
vi.mock('../../../../../CHANGELOG.md?raw', () => ({
  default: `# Changelog

## [1.6.0] - 2026-03-11

### Added

- New feature

### Fixed

- Bug fix

## [1.5.0] - 2026-03-10

### Changed

- Updated something
`,
}));

vi.mock('../../../../../CHANGELOG.fr.md?raw', () => ({
  default: `# Nouveautés

## [1.6.0] - 2026-03-11

### Added

- Nouvelle fonctionnalité

## [1.5.0] - 2026-03-10

### Changed

- Quelque chose a changé
`,
}));

// Mock @tauri-apps/api/app
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('1.6.0'),
}));

describe('ChangelogDialog', () => {
  beforeEach(() => {
    useChangelogStore.setState({ lastSeenVersion: '1.5.0', _hasHydrated: true });
  });

  it('should render dialog when open', () => {
    render(<ChangelogDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText('Changelog')).toBeInTheDocument();
  });

  it('should render all version entries', () => {
    render(<ChangelogDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/1\.6\.0/)).toBeInTheDocument();
    expect(screen.getByText(/1\.5\.0/)).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<ChangelogDialog open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText('Changelog')).not.toBeInTheDocument();
  });

  it('should call onOpenChange when closed', () => {
    const onOpenChange = vi.fn();
    render(<ChangelogDialog open={true} onOpenChange={onOpenChange} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should have a visually hidden description for accessibility', () => {
    render(<ChangelogDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText('Version history and release notes')).toBeInTheDocument();
  });

  it('should render the "current" badge using i18n', () => {
    render(<ChangelogDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText('current')).toBeInTheDocument();
  });
});
