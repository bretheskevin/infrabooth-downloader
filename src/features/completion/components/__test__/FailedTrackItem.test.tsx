import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FailedTrackItem } from '../FailedTrackItem';
import type { FailedTrack } from '@/features/queue/types/download';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

  it('should have warning border accent', () => {
    render(<FailedTrackItem track={mockTrack} />);
    const listItem = screen.getByRole('listitem');
    expect(listItem.className).toMatch(/border-warning/);
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<FailedTrackItem track={mockTrack} onRetry={onRetry} />);
    const retryButton = screen.getByRole('button', { name: 'errors.retryTrack' });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry with track id when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<FailedTrackItem track={mockTrack} onRetry={onRetry} />);
    const retryButton = screen.getByRole('button', { name: 'errors.retryTrack' });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledWith('1');
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<FailedTrackItem track={mockTrack} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
