import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SignInButton } from './SignInButton';
import * as auth from '@/features/auth/api';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign in with SoundCloud',
        'auth.openingBrowser': 'Opening browser...',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock auth module
vi.mock('@/features/auth/api', () => ({
  startOAuth: vi.fn(),
}));

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render sign-in button with correct text', () => {
    render(<SignInButton />);

    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).toBeInTheDocument();
  });

  it('should show loading state when clicked', async () => {
    vi.mocked(auth.startOAuth).mockResolvedValue();

    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Opening browser...')).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should call startOAuth when clicked', async () => {
    vi.mocked(auth.startOAuth).mockResolvedValue();

    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(auth.startOAuth).toHaveBeenCalledTimes(1);
  });

  it('should reset loading state on error', async () => {
    vi.useRealTimers(); // Use real timers for this test
    vi.mocked(auth.startOAuth).mockRejectedValue(new Error('Failed'));

    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for the error to be handled and state to reset
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).not.toBeDisabled();
    });

    vi.useFakeTimers(); // Restore fake timers for other tests
  });

  it('should reset loading state after timeout', async () => {
    vi.mocked(auth.startOAuth).mockResolvedValue();

    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toBeDisabled();

    // Fast-forward past the timeout (5 minutes)
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).not.toBeDisabled();
  });

  it('should have primary styling', () => {
    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-primary-foreground');
  });

  it('should be keyboard accessible', () => {
    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    // Button should be focusable
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('should prevent double-clicks when loading', async () => {
    vi.mocked(auth.startOAuth).mockResolvedValue();

    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign in with SoundCloud' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Try clicking again while loading
    await act(async () => {
      fireEvent.click(button);
    });

    // Should only be called once
    expect(auth.startOAuth).toHaveBeenCalledTimes(1);
  });
});
