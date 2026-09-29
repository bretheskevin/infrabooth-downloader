import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SignInButton } from '../SignInButton';
import * as auth from '@/features/auth/api';

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

vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render check browser login button', () => {
    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();
  });

  it('should show hint text on hover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });
    await user.hover(button);

    const tooltips = await screen.findAllByText('Sign in to SoundCloud in your browser for better quality downloads');
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('should show loading spinner and "Checking..." text when clicked', async () => {
    let resolveCheck: (value: boolean) => void;
    vi.mocked(auth.checkAuth).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveCheck = resolve;
        }),
    );

    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Checking...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    await act(async () => {
      resolveCheck!(true);
    });
  });

  it('should call checkAuth on click', async () => {
    vi.mocked(auth.checkAuth).mockResolvedValue(true);

    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(auth.checkAuth).toHaveBeenCalledTimes(1);
  });

  it('should disable button while checking', async () => {
    let resolveCheck: (value: boolean) => void;
    vi.mocked(auth.checkAuth).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveCheck = resolve;
        }),
    );

    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toBeDisabled();

    await act(async () => {
      resolveCheck!(false);
    });
  });

  it('should re-enable button after check completes successfully', async () => {
    vi.mocked(auth.checkAuth).mockResolvedValue(true);

    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

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

    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

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
      () =>
        new Promise<boolean>((resolve) => {
          resolveCheck = resolve;
        }),
    );

    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(auth.checkAuth).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCheck!(true);
    });
  });

  it('should be keyboard accessible', () => {
    render(
      <TooltipProvider>
        <SignInButton />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: /Check browser login/i });

    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
