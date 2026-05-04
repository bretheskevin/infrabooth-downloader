import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaylistOrderSection } from '../PlaylistOrderSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.preserveOrder': 'Number tracks',
        'download.preserveOrderDescription': 'Prefix filenames with track position (e.g. 01 - Artist - Title)',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSetPreservePlaylistOrder = vi.fn();
let mockPreservePlaylistOrder = false;

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      preservePlaylistOrder: mockPreservePlaylistOrder,
      setPreservePlaylistOrder: mockSetPreservePlaylistOrder,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('PlaylistOrderSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreservePlaylistOrder = false;
  });

  it('renders the label and description', () => {
    render(<PlaylistOrderSection />);

    expect(screen.getByText('Number tracks')).toBeInTheDocument();
    expect(screen.getByText('Prefix filenames with track position (e.g. 01 - Artist - Title)')).toBeInTheDocument();
  });

  it('renders the switch', () => {
    render(<PlaylistOrderSection />);

    expect(screen.getByTestId('preserve-order-switch')).toBeInTheDocument();
  });

  it('calls setPreservePlaylistOrder when toggled', () => {
    render(<PlaylistOrderSection />);

    const toggle = screen.getByTestId('preserve-order-switch');
    fireEvent.click(toggle);

    expect(mockSetPreservePlaylistOrder).toHaveBeenCalledWith(true);
  });

  it('reflects the current store value', () => {
    mockPreservePlaylistOrder = true;
    render(<PlaylistOrderSection />);

    const toggle = screen.getByTestId('preserve-order-switch');
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });
});
