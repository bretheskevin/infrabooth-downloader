import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ArtistProfile } from '@/bindings';
import { ArtistFollowRow } from '../components/ArtistFollowRow';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => url,
}));

const mockArtist: ArtistProfile = {
  id: 42,
  username: 'Test Artist',
  avatar_url: 'https://example.com/avatar.jpg',
  description: null,
  followers_count: 5000,
  followings_count: 100,
  track_count: 20,
  permalink_url: 'https://soundcloud.com/test',
  visuals: null,
};

describe('ArtistFollowRow', () => {
  it('renders artist username', () => {
    render(<ArtistFollowRow artist={mockArtist} onClick={vi.fn()} />);
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('renders formatted follower count', () => {
    render(<ArtistFollowRow artist={mockArtist} onClick={vi.fn()} />);
    expect(screen.getByText(/5\.0K.*artistProfile\.followers/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ArtistFollowRow artist={mockArtist} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders avatar image', () => {
    render(<ArtistFollowRow artist={mockArtist} onClick={vi.fn()} />);
    const img = screen.getByAltText('Test Artist');
    expect(img).toBeInTheDocument();
  });

  it('handles null avatar gracefully', () => {
    const noAvatar = { ...mockArtist, avatar_url: null };
    render(<ArtistFollowRow artist={noAvatar} onClick={vi.fn()} />);
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });
});
