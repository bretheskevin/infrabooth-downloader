import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlaylistArtwork } from '../components/PlaylistArtwork';

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => (url ? `${url}-resized` : null),
}));

describe('PlaylistArtwork', () => {
  it('renders image when artwork URL is provided', () => {
    render(<PlaylistArtwork artworkUrl="https://example.com/art.jpg" title="My Playlist" />);
    const img = screen.getByAltText('My Playlist');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg-resized');
  });

  it('renders fallback letter when no artwork', () => {
    render(<PlaylistArtwork artworkUrl={null} title="My Playlist" />);
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies sm size classes by default', () => {
    const { container } = render(<PlaylistArtwork artworkUrl={null} title="Test" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('w-14');
    expect(el.className).toContain('h-14');
  });

  it('applies lg size classes when specified', () => {
    const { container } = render(<PlaylistArtwork artworkUrl={null} title="Test" size="lg" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('w-full');
    expect(el.className).toContain('h-full');
  });
});
