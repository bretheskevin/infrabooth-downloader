import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ConnectionHelpDialog } from '../ConnectionHelpDialog';
import { useAuthStore } from '@/features/auth/store';
import * as auth from '@/features/auth/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.connectHelp.title': 'No session found',
        'auth.connectHelp.description': 'No SoundCloud session was found.',
        'auth.connectHelp.step1': 'Open SoundCloud in your browser',
        'auth.connectHelp.step2': 'Log in to your account',
        'auth.connectHelp.step3': 'Return here and check again',
        'auth.connectHelp.openSoundcloud': 'Open SoundCloud',
        'auth.connectHelp.checkAgain': 'Check again',
        'auth.connectHelp.appbound.title': 'Browser blocks cookie access',
        'auth.connectHelp.appbound.description': 'Use Firefox instead.',
        'auth.openInFirefox': 'Open SoundCloud in Firefox',
        'auth.downloadFirefox': 'Download Firefox',
        'auth.firefoxOpenError': 'Failed to open Firefox',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
  checkFirefoxInstalled: vi.fn().mockResolvedValue(false),
  openInFirefox: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('ConnectionHelpDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isConnectHelpOpen: false,
      cookieWarning: null,
    });
  });

  it('does not render content when closed', () => {
    render(<ConnectionHelpDialog />);
    expect(screen.queryByText('No session found')).not.toBeInTheDocument();
  });

  it('renders default mode when open with no cookieWarning', () => {
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: null });
    render(<ConnectionHelpDialog />);
    expect(screen.getByText('No session found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open SoundCloud/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check again/i })).toBeInTheDocument();
  });

  it('renders default mode steps', () => {
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: null });
    render(<ConnectionHelpDialog />);
    expect(screen.getByText(/Open SoundCloud in your browser/)).toBeInTheDocument();
    expect(screen.getByText(/Log in to your account/)).toBeInTheDocument();
    expect(screen.getByText(/Return here and check again/)).toBeInTheDocument();
  });

  it('renders appbound mode when cookieWarning is appbound_encryption', () => {
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: 'appbound_encryption' });
    render(<ConnectionHelpDialog />);
    expect(screen.getByText('Browser blocks cookie access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check again/i })).toBeInTheDocument();
  });

  it('shows Download Firefox when Firefox is not installed', async () => {
    vi.mocked(auth.checkFirefoxInstalled).mockResolvedValue(false);
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: 'appbound_encryption' });
    render(<ConnectionHelpDialog />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download Firefox/i })).toBeInTheDocument();
    });
  });

  it('shows Open SoundCloud in Firefox when Firefox is installed', async () => {
    vi.mocked(auth.checkFirefoxInstalled).mockResolvedValue(true);
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: 'appbound_encryption' });
    render(<ConnectionHelpDialog />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open SoundCloud in Firefox/i })).toBeInTheDocument();
    });
  });

  it('closes dialog on successful check again', async () => {
    vi.mocked(auth.checkAuth).mockResolvedValue(true);
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: null });
    render(<ConnectionHelpDialog />);

    const checkAgain = screen.getByRole('button', { name: /Check again/i });
    await act(async () => {
      checkAgain.click();
    });

    await waitFor(() => {
      expect(useAuthStore.getState().isConnectHelpOpen).toBe(false);
    });
  });

  it('keeps dialog open when check finds no session', async () => {
    vi.mocked(auth.checkAuth).mockResolvedValue(false);
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: null });
    render(<ConnectionHelpDialog />);

    const checkAgain = screen.getByRole('button', { name: /Check again/i });
    await act(async () => {
      checkAgain.click();
    });

    await waitFor(() => {
      expect(useAuthStore.getState().isConnectHelpOpen).toBe(true);
    });
  });

  it('keeps dialog open when check throws an error', async () => {
    vi.mocked(auth.checkAuth).mockRejectedValue(new Error('Network error'));
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: null });
    render(<ConnectionHelpDialog />);

    const checkAgain = screen.getByRole('button', { name: /Check again/i });
    await act(async () => {
      checkAgain.click();
    });

    await waitFor(() => {
      expect(useAuthStore.getState().isConnectHelpOpen).toBe(true);
    });
  });
});
