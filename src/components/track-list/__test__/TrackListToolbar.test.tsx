import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TRACK_SORT_OPTIONS } from '@/lib/sort';
import { TrackListToolbar } from '../TrackListToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.sortDefault': 'Playlist order',
        'common.sortTitle': 'Title',
        'common.sortArtist': 'Artist',
      };
      return map[key] ?? key;
    },
  }),
}));

const SORT_CONFIG = {
  options: TRACK_SORT_OPTIONS,
  active: 'default' as const,
  onChange: vi.fn(),
  direction: 'asc' as const,
  onDirectionChange: vi.fn(),
};

const baseProps = {
  isDownloadEnabled: false,
  hasSelectableTracks: false,
  isAllSelected: false,
  onToggleAll: vi.fn(),
  sort: SORT_CONFIG,
};

describe('TrackListToolbar', () => {
  it('renders active sort label', () => {
    render(<TrackListToolbar {...baseProps} />);
    expect(screen.getByText('Playlist order')).toBeInTheDocument();
  });

  it('renders select-all checkbox when download enabled and has selectable tracks', () => {
    render(<TrackListToolbar {...baseProps} isDownloadEnabled hasSelectableTracks />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('does not render sort controls when sort is undefined', () => {
    render(<TrackListToolbar {...baseProps} sort={undefined} />);
    expect(screen.queryByText('Playlist order')).not.toBeInTheDocument();
  });
});
