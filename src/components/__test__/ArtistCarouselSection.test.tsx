import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistCarouselSection } from '../ArtistCarouselSection';
import type { FollowedArtist } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/ui/scroll-carousel', () => ({
  ScrollCarousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-carousel">{children}</div>
  ),
}));

vi.mock('@/components/ui/refresh-button', () => ({
  RefreshButton: () => null,
}));

function makeArtist(overrides: Partial<FollowedArtist> & { id: number; username: string }): FollowedArtist {
  return {
    avatar_url: null,
    has_new_content: false,
    has_new_original_tracks: false,
    has_original_tracks: false,
    has_new_releases: false,
    has_new_original_releases: false,
    has_original_releases: false,
    ...overrides,
  };
}

const DEFAULT_LABELS = {
  title: 'Title',
  hideReposts: 'Hide reposts',
  scrollLeft: 'Left',
  scrollRight: 'Right',
};

const defaultProps = {
  labels: DEFAULT_LABELS,
  isLoading: false,
  error: null,
  onRefresh: vi.fn(),
  onSelectArtist: vi.fn(),
  hideReposts: false,
  onHideRepostsChange: vi.fn(),
  hideRepostsId: 'hide-reposts',
  filterFn: () => true,
};

describe('ArtistCarouselSection', () => {
  describe('sorting by new releases', () => {
    it('renders artists with new content first when getHasNew is provided', () => {
      const artists = [
        makeArtist({ id: 1, username: 'OldArtist', has_new_releases: false }),
        makeArtist({ id: 2, username: 'NewArtist', has_new_releases: true }),
        makeArtist({ id: 3, username: 'AnotherOld', has_new_releases: false }),
      ];

      render(
        <ArtistCarouselSection
          {...defaultProps}
          artists={artists}
          getHasNewAny={(a) => a.has_new_releases}
        />,
      );

      const buttons = screen.getAllByRole('button', { name: /Artist|Old/ });
      const names = buttons.map((b) => b.getAttribute('aria-label'));
      expect(names).toEqual(['NewArtist', 'OldArtist', 'AnotherOld']);
    });

    it('preserves relative order within same group', () => {
      const artists = [
        makeArtist({ id: 1, username: 'First-Old', has_new_releases: false }),
        makeArtist({ id: 2, username: 'Second-New', has_new_releases: true }),
        makeArtist({ id: 3, username: 'Third-New', has_new_releases: true }),
        makeArtist({ id: 4, username: 'Fourth-Old', has_new_releases: false }),
      ];

      render(
        <ArtistCarouselSection
          {...defaultProps}
          artists={artists}
          getHasNewAny={(a) => a.has_new_releases}
        />,
      );

      const buttons = screen.getAllByRole('button', { name: /New|Old/ });
      const names = buttons.map((b) => b.getAttribute('aria-label'));
      expect(names).toEqual(['Second-New', 'Third-New', 'First-Old', 'Fourth-Old']);
    });

    it('does not sort when no getHasNew accessor is provided', () => {
      const artists = [
        makeArtist({ id: 1, username: 'Zebra', has_new_releases: true }),
        makeArtist({ id: 2, username: 'Alpha', has_new_releases: false }),
        makeArtist({ id: 3, username: 'Middle', has_new_releases: true }),
      ];

      render(
        <ArtistCarouselSection {...defaultProps} artists={artists} />,
      );

      const buttons = screen.getAllByRole('button', { name: /Zebra|Alpha|Middle/ });
      const names = buttons.map((b) => b.getAttribute('aria-label'));
      expect(names).toEqual(['Zebra', 'Alpha', 'Middle']);
    });
  });

  describe('filtering reposts', () => {
    it('applies filterFn when hideReposts is true', () => {
      const artists = [
        makeArtist({ id: 1, username: 'HasOriginal', has_original_releases: true }),
        makeArtist({ id: 2, username: 'OnlyReposts', has_original_releases: false }),
      ];

      render(
        <ArtistCarouselSection
          {...defaultProps}
          artists={artists}
          hideReposts={true}
          filterFn={(a) => a.has_original_releases}
        />,
      );

      expect(screen.getByLabelText('HasOriginal')).toBeInTheDocument();
      expect(screen.queryByLabelText('OnlyReposts')).not.toBeInTheDocument();
    });

    it('sorts by getHasNewOriginal when hideReposts is true', () => {
      const artists = [
        makeArtist({
          id: 1, username: 'AnyNewOnly',
          has_new_releases: true, has_new_original_releases: false, has_original_releases: true,
        }),
        makeArtist({
          id: 2, username: 'BothNew',
          has_new_releases: true, has_new_original_releases: true, has_original_releases: true,
        }),
        makeArtist({
          id: 3, username: 'NoNew',
          has_new_releases: false, has_new_original_releases: false, has_original_releases: true,
        }),
      ];

      render(
        <ArtistCarouselSection
          {...defaultProps}
          artists={artists}
          hideReposts={true}
          filterFn={(a) => a.has_original_releases}
          getHasNewAny={(a) => a.has_new_releases}
          getHasNewOriginal={(a) => a.has_new_original_releases}
        />,
      );

      const buttons = screen.getAllByRole('button', { name: /AnyNewOnly|BothNew|NoNew/ });
      const names = buttons.map((b) => b.getAttribute('aria-label'));
      expect(names).toEqual(['BothNew', 'AnyNewOnly', 'NoNew']);
    });

    it('sorts by getHasNewAny when hideReposts is false', () => {
      const artists = [
        makeArtist({ id: 1, username: 'AnyNewOnly', has_new_releases: true, has_new_original_releases: false }),
        makeArtist({ id: 2, username: 'NoNew', has_new_releases: false, has_new_original_releases: false }),
        makeArtist({ id: 3, username: 'BothNew', has_new_releases: true, has_new_original_releases: true }),
      ];

      render(
        <ArtistCarouselSection
          {...defaultProps}
          artists={artists}
          hideReposts={false}
          getHasNewAny={(a) => a.has_new_releases}
          getHasNewOriginal={(a) => a.has_new_original_releases}
        />,
      );

      const buttons = screen.getAllByRole('button', { name: /AnyNewOnly|NoNew|BothNew/ });
      const names = buttons.map((b) => b.getAttribute('aria-label'));
      expect(names).toEqual(['AnyNewOnly', 'BothNew', 'NoNew']);
    });
  });

  describe('empty and loading states', () => {
    it('returns null when loading', () => {
      const { container } = render(
        <ArtistCarouselSection
          {...defaultProps}
          artists={[]}
          isLoading={true}
        />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('returns null when no artists to display', () => {
      const { container } = render(
        <ArtistCarouselSection {...defaultProps} artists={[]} />,
      );
      expect(container.innerHTML).toBe('');
    });
  });
});
