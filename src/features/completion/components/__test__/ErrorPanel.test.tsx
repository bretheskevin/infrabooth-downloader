import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ErrorPanel } from '../ErrorPanel';
import type { FailedTrack } from '@/features/queue/types/download';
import type { ErrorCode } from '@/features/queue/types/errors';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'errors.panelTitle': 'Failed Downloads',
        'errors.closePanel': 'Close error panel',
        'errors.tracksFailed': options?.count === 1 ? '1 track failed' : `${options?.count} tracks failed`,
        'errors.groupGeoBlocked': 'Unavailable in your region',
        'errors.groupUnavailable': 'Track removed or private',
        'errors.groupNetwork': 'Network errors',
        'errors.groupOther': 'Other errors',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createMockTrack = (
  id: string,
  title: string,
  artist: string,
  errorCode: ErrorCode,
  errorMessage: string
): FailedTrack => ({
  id,
  title,
  artist,
  error: { code: errorCode, message: errorMessage },
});

describe('ErrorPanel', () => {
  const mockTracks: FailedTrack[] = [
    createMockTrack('1', 'Track One', 'Artist A', 'GEO_BLOCKED', 'Not available in your region'),
    createMockTrack('2', 'Track Two', 'Artist B', 'DOWNLOAD_FAILED', 'Track unavailable'),
    createMockTrack('3', 'Track Three', 'Artist C', 'NETWORK_ERROR', 'Connection failed'),
  ];

  it('should render panel header with title', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByText('Failed Downloads')).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /close error panel/i })).toBeInTheDocument();
  });

  it('should call onOpenChange when close button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close error panel/i });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should render list of failed tracks', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Track One')).toBeInTheDocument();
    expect(screen.getByText('Track Two')).toBeInTheDocument();
    expect(screen.getByText('Track Three')).toBeInTheDocument();
  });

  it('should render artist names', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText('Artist B')).toBeInTheDocument();
    expect(screen.getByText('Artist C')).toBeInTheDocument();
  });

  it('should have role="region" and aria-label', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    const region = screen.getByRole('region', { name: /failed downloads/i });
    expect(region).toBeInTheDocument();
  });

  it('should be scrollable when content exceeds max height', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    // The scroll area should exist
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    expect(scrollArea).toBeInTheDocument();
  });

  it('should support Escape key to close panel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should not render content when isOpen is false', () => {
    render(
      <ErrorPanel
        failedTracks={mockTracks}
        isOpen={false}
        onOpenChange={vi.fn()}
      />
    );

    // Panel header should not be visible
    expect(screen.queryByText('Failed Downloads')).not.toBeInTheDocument();
  });

  it('should render nothing when failedTracks is empty', () => {
    const { container } = render(
      <ErrorPanel
        failedTracks={[]}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
