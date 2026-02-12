import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FailureGroup } from './FailureGroup';
import type { FailedTrack } from '@/features/download/types/download';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errors.groupGeoBlocked': 'Unavailable in your region',
        'errors.groupUnavailable': 'Track removed or private',
        'errors.groupNetwork': 'Network errors',
        'errors.groupOther': 'Other errors',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createMockTrack = (id: string, title: string, artist: string): FailedTrack => ({
  id,
  title,
  artist,
  error: { code: 'GEO_BLOCKED', message: 'Not available' },
});

describe('FailureGroup', () => {
  const mockTracks = [
    createMockTrack('1', 'Track One', 'Artist A'),
    createMockTrack('2', 'Track Two', 'Artist B'),
  ];

  it('should render group header with category label and count', () => {
    render(<FailureGroup category="geo_blocked" tracks={mockTracks} />);
    expect(screen.getByText('Unavailable in your region (2)')).toBeInTheDocument();
  });

  it('should render list of FailedTrackItem components', () => {
    render(<FailureGroup category="geo_blocked" tracks={mockTracks} />);
    expect(screen.getByText('Track One')).toBeInTheDocument();
    expect(screen.getByText('Track Two')).toBeInTheDocument();
  });

  it('should render nothing when tracks array is empty', () => {
    const { container } = render(<FailureGroup category="geo_blocked" tracks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render correct label for unavailable category', () => {
    render(<FailureGroup category="unavailable" tracks={mockTracks} />);
    expect(screen.getByText('Track removed or private (2)')).toBeInTheDocument();
  });

  it('should render correct label for network category', () => {
    render(<FailureGroup category="network" tracks={mockTracks} />);
    expect(screen.getByText('Network errors (2)')).toBeInTheDocument();
  });

  it('should render correct label for other category', () => {
    render(<FailureGroup category="other" tracks={mockTracks} />);
    expect(screen.getByText('Other errors (2)')).toBeInTheDocument();
  });

  it('should have role="group" attribute', () => {
    render(<FailureGroup category="geo_blocked" tracks={mockTracks} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });
});
