import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RateLimitBanner, RateLimitBannerWithTransition } from './RateLimitBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.rateLimitMessage':
          'Brief pause -- SoundCloud rate limit (this is normal)',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RateLimitBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the rate limit message', () => {
      render(<RateLimitBanner />);

      expect(
        screen.getByText(
          'Brief pause -- SoundCloud rate limit (this is normal)'
        )
      ).toBeInTheDocument();
    });

    it('should render with status role for accessibility', () => {
      render(<RateLimitBanner />);

      const banner = screen.getByRole('status');
      expect(banner).toBeInTheDocument();
    });

    it('should have aria-live polite for screen readers', () => {
      render(<RateLimitBanner />);

      const banner = screen.getByRole('status');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    it('should render a clock or pause icon', () => {
      render(<RateLimitBanner />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have amber background styling', () => {
      render(<RateLimitBanner />);

      const banner = screen.getByRole('status');
      expect(banner).toHaveClass('bg-amber-50');
    });

    it('should have amber border styling', () => {
      render(<RateLimitBanner />);

      const banner = screen.getByRole('status');
      expect(banner).toHaveClass('border-amber-200');
    });
  });
});

describe('RateLimitBannerWithTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should show banner when isVisible is true', () => {
      render(<RateLimitBannerWithTransition isVisible={true} />);

      expect(
        screen.getByText(
          'Brief pause -- SoundCloud rate limit (this is normal)'
        )
      ).toBeInTheDocument();
    });

    it('should have opacity-100 when visible', () => {
      render(<RateLimitBannerWithTransition isVisible={true} />);

      const wrapper = screen.getByTestId('rate-limit-banner-wrapper');
      expect(wrapper).toHaveClass('opacity-100');
    });

    it('should have opacity-0 when not visible', () => {
      render(<RateLimitBannerWithTransition isVisible={false} />);

      const wrapper = screen.getByTestId('rate-limit-banner-wrapper');
      expect(wrapper).toHaveClass('opacity-0');
    });

    it('should have transition classes for smooth animation', () => {
      render(<RateLimitBannerWithTransition isVisible={true} />);

      const wrapper = screen.getByTestId('rate-limit-banner-wrapper');
      expect(wrapper).toHaveClass('transition-all');
      expect(wrapper).toHaveClass('duration-300');
    });

    it('should have overflow-hidden when not visible to prevent layout shift', () => {
      render(<RateLimitBannerWithTransition isVisible={false} />);

      const wrapper = screen.getByTestId('rate-limit-banner-wrapper');
      expect(wrapper).toHaveClass('overflow-hidden');
    });
  });
});

describe('RateLimitBanner accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have role="status" for screen reader announcement', () => {
    render(<RateLimitBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
  });

  it('should have aria-live="polite" for non-urgent updates', () => {
    render(<RateLimitBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('should have icon paired with text (not color-only)', () => {
    render(<RateLimitBanner />);

    // Icon should be present
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();

    // Text should be present alongside icon
    expect(
      screen.getByText(
        'Brief pause -- SoundCloud rate limit (this is normal)'
      )
    ).toBeInTheDocument();
  });

  it('should have sufficient color contrast (amber-800 text on amber-50 bg)', () => {
    render(<RateLimitBanner />);
    const banner = screen.getByRole('status');

    // amber-50 background
    expect(banner).toHaveClass('bg-amber-50');

    // amber-800 text in AlertDescription
    const description = banner.querySelector('[class*="text-amber-800"]');
    expect(description).toBeInTheDocument();
  });
});
