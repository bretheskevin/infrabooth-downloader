import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RateLimitDialog } from '../RateLimitDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.rateLimitDialogTitle': 'SoundCloud Rate Limit Reached',
        'download.rateLimitDialogDescription':
          "SoundCloud limits streaming requests to 15,000 per 24-hour period. You've reached this limit.\n\nThis is a SoundCloud restriction, not an issue with the application.",
        'download.rateLimitDialogRetry': 'Retry',
        'download.rateLimitDialogStop': 'Stop Download',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RateLimitDialog', () => {
  const defaultProps = {
    open: true,
    onRetry: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(<RateLimitDialog {...defaultProps} />);
    expect(screen.getByText('SoundCloud Rate Limit Reached')).toBeInTheDocument();
  });

  it('should show rate limit explanation', () => {
    render(<RateLimitDialog {...defaultProps} />);
    expect(screen.getByText(/SoundCloud limits streaming requests to 15,000/)).toBeInTheDocument();
  });

  it('should clarify it is not the app fault', () => {
    render(<RateLimitDialog {...defaultProps} />);
    expect(screen.getByText(/not an issue with the application/)).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(<RateLimitDialog {...defaultProps} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show stop button', () => {
    render(<RateLimitDialog {...defaultProps} />);
    expect(screen.getByText('Stop Download')).toBeInTheDocument();
  });

  it('should call onRetry when retry is clicked', () => {
    render(<RateLimitDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(defaultProps.onRetry).toHaveBeenCalledOnce();
  });

  it('should call onStop when stop is clicked', () => {
    render(<RateLimitDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Stop Download'));
    expect(defaultProps.onStop).toHaveBeenCalledOnce();
  });

  it('should not render when closed', () => {
    render(<RateLimitDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('SoundCloud Rate Limit Reached')).not.toBeInTheDocument();
  });
});
