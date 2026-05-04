import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from '../AppLayout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'library.pasteUrlTab': 'Paste a link',
        'library.discoverTab': 'Discover',
        'library.tabLabel': 'Library',
        'search.tabLabel': 'Search',
      };
      return translations[key] || key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('../Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('../Sidebar', () => ({
  Sidebar: (props: { activePage: string }) => <div data-testid="sidebar">Sidebar: {props.activePage}</div>,
}));

vi.mock('@/features/update', () => ({
  UpdateBanner: () => <div data-testid="update-banner" />,
}));

vi.mock('@/features/player/hooks/useIsExpandedBarVisible', () => ({
  useIsExpandedBarVisible: () => false,
}));

vi.mock('@/features/player/components/ExpandedBar', () => ({
  EXPANDED_BAR_HEIGHT: 64,
}));

vi.mock('@/features/player/components/PlayerRail', () => ({
  PlayerRail: () => <div data-testid="player-rail">PlayerRail</div>,
}));

vi.mock('@/features/settings', () => ({
  useIsDownloadEnabled: () => true,
}));

const mockUseIsWidescreen = vi.fn(() => false);
vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => mockUseIsWidescreen(),
}));

describe('AppLayout', () => {
  const defaultProps = {
    activePage: 'download' as const,
    onPageChange: vi.fn(),
    isSignedIn: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsWidescreen.mockReturnValue(false);
  });

  describe('narrow (non-widescreen) layout', () => {
    it('should render Header when not widescreen', () => {
      render(
        <AppLayout {...defaultProps}>
          <div data-testid="page-content">Content</div>
        </AppLayout>,
      );
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('should render PageNav tabs when hideTabs is false', () => {
      render(
        <AppLayout {...defaultProps} hideTabs={false}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.getByText('Paste a link')).toBeInTheDocument();
      expect(screen.getByText('Library')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should NOT render Sidebar when not widescreen', () => {
      render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    });

    it('should use container mx-auto on main element', () => {
      const { container } = render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      const main = container.querySelector('main');
      expect(main?.className).toContain('container');
      expect(main?.className).toContain('mx-auto');
    });
  });

  describe('widescreen layout', () => {
    beforeEach(() => {
      mockUseIsWidescreen.mockReturnValue(true);
    });

    it('should render Sidebar when widescreen', () => {
      render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should NOT render Header when widescreen', () => {
      render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    });

    it('should NOT render PageNav tabs when widescreen', () => {
      render(
        <AppLayout {...defaultProps} hideTabs={false}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.queryByText('Paste a link')).not.toBeInTheDocument();
    });

    it('should render children in the main content area', () => {
      render(
        <AppLayout {...defaultProps}>
          <div data-testid="page-content">Content</div>
        </AppLayout>,
      );
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('should NOT use container mx-auto on main element', () => {
      const { container } = render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      const main = container.querySelector('main');
      expect(main?.className).not.toContain('container');
      expect(main?.className).not.toContain('mx-auto');
    });

    it('should use px-8 padding on main element when widescreen', () => {
      const { container } = render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      const main = container.querySelector('main');
      expect(main?.className).toContain('px-8');
    });

    it('should render PlayerRail when widescreen', () => {
      render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.getByTestId('player-rail')).toBeInTheDocument();
    });

    it('should NOT have paddingBottom on main element when widescreen', () => {
      const { container } = render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      const main = container.querySelector('main');
      expect(main?.style.paddingBottom).toBe('');
    });

    it('should NOT have transition-padding-bottom class on main when widescreen', () => {
      const { container } = render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      const main = container.querySelector('main');
      expect(main?.className).not.toContain('transition-[padding-bottom]');
    });
  });

  describe('narrow layout', () => {
    it('should NOT render PlayerRail when not widescreen', () => {
      render(
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>,
      );
      expect(screen.queryByTestId('player-rail')).not.toBeInTheDocument();
    });
  });
});
