import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaylistDetailHeader } from '../PlaylistDetailHeader';
import type { LibraryPlaylist } from '@/bindings';

let mockIsWidescreen = false;

vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => mockIsWidescreen,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'library.detail.tracks') return `${opts?.count} tracks`;
      if (key === 'common.back') return 'Back';
      return key;
    },
  }),
}));

vi.mock('@/features/artist-profile/store', () => ({
  useArtistProfileStore: { getState: () => ({ openProfile: vi.fn() }) },
}));

const mockPlaylist: LibraryPlaylist = {
  id: 1,
  title: 'Test Playlist',
  username: 'TestUser',
  user_id: 99,
  artwork_url: null,
  track_count: 10,
  duration: 3600000,
  permalink_url: 'https://soundcloud.com/test/sets/test',
  is_owned: true,
  is_public: true,
  secret_token: null,
};

describe('PlaylistDetailHeader', () => {
  const defaultProps = {
    playlist: mockPlaylist,
    artworkUrl: null,
    trackCount: 10,
    onBack: vi.fn(),
    folderMetadata: null,
  };

  beforeEach(() => {
    mockIsWidescreen = false;
  });

  it('uses small artwork in narrow mode', () => {
    render(<PlaylistDetailHeader {...defaultProps} />);
    const container = screen.getByTestId('artwork-container');
    expect(container.className).toContain('w-12');
    expect(container.className).toContain('h-12');
    expect(container.className).toContain('rounded-lg');
  });

  it('uses large artwork in widescreen mode', () => {
    mockIsWidescreen = true;
    render(<PlaylistDetailHeader {...defaultProps} />);
    const container = screen.getByTestId('artwork-container');
    expect(container.className).toContain('w-[140px]');
    expect(container.className).toContain('h-[140px]');
    expect(container.className).toContain('rounded-xl');
  });

  it('uses small placeholder icon in narrow mode', () => {
    render(<PlaylistDetailHeader {...defaultProps} />);
    const icon = screen.getByTestId('artwork-placeholder-icon');
    expect(icon.getAttribute('class')).toContain('w-5');
    expect(icon.getAttribute('class')).toContain('h-5');
  });

  it('uses large placeholder icon in widescreen mode', () => {
    mockIsWidescreen = true;
    render(<PlaylistDetailHeader {...defaultProps} />);
    const icon = screen.getByTestId('artwork-placeholder-icon');
    expect(icon.getAttribute('class')).toContain('w-10');
    expect(icon.getAttribute('class')).toContain('h-10');
  });

  it('renders artwork image when artworkUrl provided', () => {
    render(<PlaylistDetailHeader {...defaultProps} artworkUrl="https://example.com/art.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });
});
