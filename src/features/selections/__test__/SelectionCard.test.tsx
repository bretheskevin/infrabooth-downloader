import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/features/settings/hooks/useIsDownloadEnabled', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

let mockIsWidescreen = false;
vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => mockIsWidescreen,
}));

import { SelectionCard } from '../components/SelectionCard';
import type { Selection } from '@/bindings';

const mockMix: Selection = {
  id: 1,
  title: 'Your Mix 1',
  artworkUrl: null,
  trackCount: 5,
  tracks: [{ id: 10, artwork_url: null, user: { username: 'Artist1' } }],
} as unknown as Selection;

describe('SelectionCard', () => {
  afterEach(() => {
    mockIsWidescreen = false;
  });

  describe('widescreen hover elevation', () => {
    it('uses shadow-elevated hover when widescreen', () => {
      mockIsWidescreen = true;
      const { container } = render(<SelectionCard mix={mockMix} index={0} onClick={vi.fn()} onDownload={vi.fn()} />);

      const card = container.firstElementChild!;
      expect(card.className).toContain('hover:shadow-elevated');
      expect(card.className).toContain('hover:-translate-y-0.5');
      expect(card.className).not.toContain('hover:scale-[1.02]');
      expect(card.className).toContain('border-border/60');
    });

    it('uses scale hover when narrow', () => {
      mockIsWidescreen = false;
      const { container } = render(<SelectionCard mix={mockMix} index={0} onClick={vi.fn()} onDownload={vi.fn()} />);

      const card = container.firstElementChild!;
      expect(card.className).toContain('hover:scale-[1.02]');
      expect(card.className).toContain('border-border');
      expect(card.className).not.toContain('hover:shadow-elevated');
    });
  });
});
