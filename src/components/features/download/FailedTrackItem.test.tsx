import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FailedTrackItem } from './FailedTrackItem';
import type { FailedTrack } from '@/types/download';

describe('FailedTrackItem', () => {
  const mockTrack: FailedTrack = {
    id: '1',
    title: 'Test Track Title',
    artist: 'Test Artist Name',
    error: { code: 'GEO_BLOCKED', message: 'Not available in your region' },
  };

  it('should display track title', () => {
    render(<FailedTrackItem track={mockTrack} />);
    expect(screen.getByText('Test Track Title')).toBeInTheDocument();
  });

  it('should display artist name', () => {
    render(<FailedTrackItem track={mockTrack} />);
    expect(screen.getByText('Test Artist Name')).toBeInTheDocument();
  });

  it('should render warning icon', () => {
    render(<FailedTrackItem track={mockTrack} />);
    const icon = document.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('should have role="listitem"', () => {
    render(<FailedTrackItem track={mockTrack} />);
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('should truncate long titles with ellipsis via CSS class', () => {
    const longTitleTrack: FailedTrack = {
      ...mockTrack,
      title: 'This is a very long track title that should be truncated with ellipsis',
    };
    render(<FailedTrackItem track={longTitleTrack} />);
    const titleElement = screen.getByText(longTitleTrack.title);
    expect(titleElement.className).toMatch(/truncate/);
  });

  it('should display artist in muted styling', () => {
    render(<FailedTrackItem track={mockTrack} />);
    const artistElement = screen.getByText('Test Artist Name');
    expect(artistElement).toHaveClass('text-muted-foreground');
  });
});
