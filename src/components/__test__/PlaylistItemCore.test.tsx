import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaylistItemCore } from '../PlaylistItemCore';

describe('PlaylistItemCore', () => {
  it('renders artwork image when artworkUrl is provided', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl="https://example.com/art.jpg" title="My Playlist" subtitle="some artist" />
      </div>,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });

  it('renders placeholder when artworkUrl is null', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="My Playlist" subtitle="some artist" />
      </div>,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('playlist-item-artwork-placeholder')).toBeInTheDocument();
  });

  it('renders title text', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="Cool Playlist" subtitle="Artist" />
      </div>,
    );
    expect(screen.getByText('Cool Playlist')).toBeInTheDocument();
  });

  it('renders subtitle as a string', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="Playlist" subtitle="some subtitle text" />
      </div>,
    );
    expect(screen.getByText('some subtitle text')).toBeInTheDocument();
  });

  it('renders subtitle as a ReactNode', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="Playlist" subtitle={<span data-testid="custom-subtitle">custom node</span>} />
      </div>,
    );
    expect(screen.getByTestId('custom-subtitle')).toBeInTheDocument();
  });

  it('renders titleAddon alongside the title', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="Playlist" subtitle="sub" titleAddon={<span data-testid="lock-icon">lock</span>} />
      </div>,
    );
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('renders children as trailing content', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="Playlist" subtitle="sub">
          <button>Download</button>
        </PlaylistItemCore>
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('applies artworkClassName to the artwork image', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl="https://example.com/art.jpg" title="Playlist" subtitle="sub" artworkClassName="w-10 h-10 rounded" />
      </div>,
    );
    const img = screen.getByRole('img');
    expect(img.className).toContain('w-10');
    expect(img.className).toContain('h-10');
    expect(img.className).toContain('rounded');
  });

  it('applies artworkClassName to the placeholder div', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl={null} title="Playlist" subtitle="sub" artworkClassName="w-10 h-10 rounded" />
      </div>,
    );
    const placeholder = screen.getByTestId('playlist-item-artwork-placeholder');
    expect(placeholder.className).toContain('w-10');
    expect(placeholder.className).toContain('h-10');
  });

  it('uses default artwork size when artworkClassName is omitted', () => {
    render(
      <div>
        <PlaylistItemCore artworkUrl="https://example.com/art.jpg" title="Playlist" subtitle="sub" />
      </div>,
    );
    const img = screen.getByRole('img');
    expect(img.className).toContain('w-12');
    expect(img.className).toContain('h-12');
    expect(img.className).toContain('rounded-md');
  });
});
