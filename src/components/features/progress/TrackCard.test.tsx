import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackCard } from './TrackCard';
import type { Track } from '@/types/track';

const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track Title',
  artist: 'Test Artist',
  artworkUrl: 'https://example.com/artwork.jpg',
  status: 'pending',
};

const mockTrackWithoutArtwork: Track = {
  ...mockTrack,
  id: 'track-2',
  artworkUrl: null,
};

const mockTrackWithLongTitle: Track = {
  ...mockTrack,
  id: 'track-3',
  title: 'This Is A Very Long Track Title That Should Be Truncated With Ellipsis',
  artist: 'Artist With A Very Long Name That Should Also Be Truncated',
};

describe('TrackCard', () => {
  describe('rendering', () => {
    it('should render track title', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Test Track Title')).toBeInTheDocument();
    });

    it('should render artist name', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should render avatar container when artworkUrl is provided', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      // Radix Avatar shows fallback until image loads - just verify the avatar wrapper exists
      const avatar = document.querySelector('span[class*="overflow-hidden"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('h-12', 'w-12', 'rounded-md');
    });

    it('should render fallback when artworkUrl is null', () => {
      render(<TrackCard track={mockTrackWithoutArtwork} isCurrentTrack={false} />);
      // Fallback should be visible (music note icon)
      const fallback = screen.getByTestId('artwork-fallback');
      expect(fallback).toBeInTheDocument();
    });
  });

  describe('current track highlight', () => {
    it('should apply highlight styles when isCurrentTrack is true', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={true} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('bg-primary/10');
      expect(card).toHaveClass('border-l-2');
      expect(card).toHaveClass('border-l-primary');
    });

    it('should not apply highlight styles when isCurrentTrack is false', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).not.toHaveClass('bg-primary/10');
    });
  });

  describe('accessibility', () => {
    it('should have role="listitem"', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('should have aria-current when current track', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={true} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveAttribute('aria-current', 'true');
    });

    it('should not have aria-current when not current track', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).not.toHaveAttribute('aria-current');
    });
  });

  describe('text truncation', () => {
    it('should have truncate class on title', () => {
      render(<TrackCard track={mockTrackWithLongTitle} isCurrentTrack={false} />);
      const title = screen.getByText(mockTrackWithLongTitle.title);
      expect(title).toHaveClass('truncate');
    });

    it('should have truncate class on artist', () => {
      render(<TrackCard track={mockTrackWithLongTitle} isCurrentTrack={false} />);
      const artist = screen.getByText(mockTrackWithLongTitle.artist);
      expect(artist).toHaveClass('truncate');
    });
  });
});
