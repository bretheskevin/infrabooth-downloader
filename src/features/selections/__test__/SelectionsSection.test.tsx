import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

let mockIsWidescreen = false;
vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => mockIsWidescreen,
}));

vi.mock('@/features/settings/hooks/useIsDownloadEnabled', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('../hooks/useSelections', () => ({
  useSelections: () => ({
    data: [
      {
        id: 1,
        title: 'Your Mix 1',
        artworkUrl: null,
        trackCount: 5,
        tracks: [{ id: 10, artwork_url: null, user: { username: 'Artist1' } }],
      },
      {
        id: 2,
        title: 'Your Mix 2',
        artworkUrl: null,
        trackCount: 3,
        tracks: [{ id: 20, artwork_url: null, user: { username: 'Artist2' } }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { SelectionsSection } from '../components/SelectionsSection';

describe('SelectionsSection', () => {
  afterEach(() => {
    mockIsWidescreen = false;
  });

  describe('widescreen SelectionGroup header polish', () => {
    it('applies editorial header styling when widescreen', () => {
      mockIsWidescreen = true;
      render(<SelectionsSection onSelectMix={vi.fn()} onDownloadMix={vi.fn()} />);

      const title = screen.getByText('selections.sectionTitle');
      expect(title.className).toContain('text-[15px]');

      const headerRow = title.closest('div');
      expect(headerRow?.className).toContain('border-b');
      expect(headerRow?.className).toContain('border-border/40');
      expect(headerRow?.className).toContain('pb-2');
      expect(headerRow?.className).toContain('mb-1');
    });

    it('shows count label when widescreen', () => {
      mockIsWidescreen = true;
      render(<SelectionsSection onSelectMix={vi.fn()} onDownloadMix={vi.fn()} />);

      const countLabel = screen.getByText('2');
      expect(countLabel.className).toContain('tabular-nums');
      expect(countLabel.className).toContain('text-xs');
    });

    it('keeps default header styling when narrow', () => {
      mockIsWidescreen = false;
      render(<SelectionsSection onSelectMix={vi.fn()} onDownloadMix={vi.fn()} />);

      const title = screen.getByText('selections.sectionTitle');
      expect(title.className).toContain('text-sm');
      expect(title.className).not.toContain('text-[15px]');
    });

    it('does not show count label when narrow', () => {
      mockIsWidescreen = false;
      render(<SelectionsSection onSelectMix={vi.fn()} onDownloadMix={vi.fn()} />);

      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });
});
