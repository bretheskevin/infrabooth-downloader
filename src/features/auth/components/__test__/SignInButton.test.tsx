import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SignInButton } from '../SignInButton';
import * as auth from '@/features/auth/api';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.signInHint': 'Sign in to SoundCloud in your browser for better quality downloads',
        'auth.checkBrowser': 'Check browser login',
        'auth.checking': 'Checking...',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock auth module
vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
}));

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render check browser login button', () => {
    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();
  });

  it('should show hint text on hover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });
    await user.hover(button);

    const tooltips = await screen.findAllByText('Sign in to SoundCloud in your browser for better quality downloads');
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('should show loading spinner and "Checking..." text when clicked', async () => {
    // Make checkAuth hang so we can observe loading state
    let resolveCheck: (value: boolean) => void;
    vi.mocked(auth.checkAuth).mockImplementation(
      () => new Promise<boolean>((resolve) => { resolveCheck = resolve; })
    );

    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Checking...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Cleanup: resolve the promise
    await act(async () => {
      resolveCheck!(true);
    });
  });

  it('should call checkAuth on click', async () => {
    vi.mocked(auth.checkAuth).mockResolvedValue(true);

    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(auth.checkAuth).toHaveBeenCalledTimes(1);
  });

  it('should disable button while checking', async () => {
    let resolveCheck: (value: boolean) => void;
    vi.mocked(auth.checkAuth).mockImplementation(
      () => new Promise<boolean>((resolve) => { resolveCheck = resolve; })
    );

    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toBeDisabled();

    // Cleanup
    await act(async () => {
      resolveCheck!(false);
    });
  });

  it('should re-enable button after check completes successfully', async () => {
    vi.mocked(auth.checkAuth).mockResolvedValue(true);

    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Check browser login/i })).not.toBeDisabled();
    });
  });

  it('should re-enable button after check fails', async () => {
    vi.mocked(auth.checkAuth).mockRejectedValue(new Error('Failed'));

    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Check browser login/i })).not.toBeDisabled();
    });
  });

  it('should prevent double-clicks when checking', async () => {
    let resolveCheck: (value: boolean) => void;
    vi.mocked(auth.checkAuth).mockImplementation(
      () => new Promise<boolean>((resolve) => { resolveCheck = resolve; })
    );

    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // Try clicking again while checking
    await act(async () => {
      fireEvent.click(button);
    });

    // Should only be called once since button is disabled
    expect(auth.checkAuth).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveCheck!(true);
    });
  });

  it('should be keyboard accessible', () => {
    render(<TooltipProvider><SignInButton /></TooltipProvider>);

    const button = screen.getByRole('button', { name: /Check browser login/i });

    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
