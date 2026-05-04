import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaylistDetailHeader } from '@/components/playlist-detail';
import type { PlaylistData } from '@/components/playlist-detail';

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

vi.mock('@/features/artist-profile/hooks/useArtistProfile', () => ({
  useArtistProfile: () => ({ data: { avatar_url: 'https://example.com/avatar.jpg' } }),
}));

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => url,
}));

const mockPlaylist: PlaylistData = {
  id: 1,
  title: 'Test Playlist',
  username: 'TestUser',
  userId: 99,
  artworkUrl: null,
  trackCount: 10,
  duration: 3600000,
  permalinkUrl: 'https://soundcloud.com/test/sets/test',
  isOwned: true,
  secretToken: null,
};

describe('PlaylistDetailHeader', () => {
  const defaultProps = {
    playlist: mockPlaylist,
    artworkUrl: null,
    trackCount: 10,
    breadcrumbItems: [{ label: 'Library', onClick: vi.fn() }],
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
    expect(container.className).toContain('rounded-2xl');
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

  it('does not render gradient background in widescreen hero', () => {
    mockIsWidescreen = true;
    const onPlayAll = vi.fn();
    const onShuffle = vi.fn();
    render(<PlaylistDetailHeader {...defaultProps} onPlayAll={onPlayAll} onShuffle={onShuffle} />);
    const gradient = document.querySelector('.from-primary\\/\\[0\\.06\\]');
    expect(gradient).toBeNull();
  });

  it('renders breadcrumb label in widescreen mode', () => {
    mockIsWidescreen = true;
    render(<PlaylistDetailHeader {...defaultProps} />);
    expect(screen.getByText('Library')).toBeTruthy();
  });

  it('renders breadcrumb navigation in narrow mode', () => {
    mockIsWidescreen = false;
    render(<PlaylistDetailHeader {...defaultProps} />);
    const gradient = document.querySelector('.from-primary\\/\\[0\\.06\\]');
    expect(gradient).toBeNull();
  });

  it('renders both action buttons with same size classes in widescreen', () => {
    mockIsWidescreen = true;
    const { container } = render(<PlaylistDetailHeader {...defaultProps} onPlayAll={vi.fn()} onShuffle={vi.fn()} />);
    const buttons = container.querySelectorAll('.rounded-full');
    const shuffleBtn = Array.from(buttons).find((b) => b.textContent?.includes('common.shuffle'));
    const playAllBtn = Array.from(buttons).find((b) => b.textContent?.includes('library.detail.playAll'));
    expect(shuffleBtn).toBeTruthy();
    expect(playAllBtn).toBeTruthy();
    expect(shuffleBtn!.className).not.toContain('shadow-glow-lg');
    expect(playAllBtn!.className).not.toContain('shadow-glow-lg');
  });
});
