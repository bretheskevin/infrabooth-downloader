import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthContainer } from '../AuthContainer';
import { useAuthStore } from '@/features/auth/store';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'auth.signInHint': 'Sign in to SoundCloud in your browser for better quality downloads',
        'auth.checkBrowser': 'Check browser login',
        'auth.checking': 'Checking...',
        'auth.qualityBadge': 'Go+ 256kbps',
        'auth.signOut': 'Sign Out',
        'auth.switchAccount': 'Switch Account',
        'auth.profilePicker.title': 'Choose Account',
        'auth.profilePicker.description': 'Multiple accounts found.',
        'auth.connectHelp.title': 'No session found',
      };
      const template = translations[key] || key;
      if (options) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(options[k] || ''));
      }
      return template;
    },
  }),
}));

vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
  checkFirefoxInstalled: vi.fn().mockResolvedValue(false),
  openInFirefox: vi.fn(),
  signOut: vi.fn(),
  listProfiles: vi.fn().mockResolvedValue([]),
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

describe('AuthContainer', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isSignedIn: false,
      username: null,
      plan: null,
      isPickerOpen: false,
      profiles: [],
      isConnectHelpOpen: false,
    });
  });

  it('should render SignInButton when not signed in', () => {
    render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();
  });

  it('should render UserMenu when signed in with username', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Go+ 256kbps')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check browser login/i })).not.toBeInTheDocument();
  });

  it('should switch from SignInButton to UserMenu when auth state changes', () => {
    const { rerender } = render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();

    act(() => {
      useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });
    });

    rerender(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check browser login/i })).not.toBeInTheDocument();
  });

  it('should have transition classes for smooth state changes', () => {
    const { container } = render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('transition-opacity', 'duration-200');
  });

  it('should render ProfileSelectDialog (closed by default, no crash)', () => {
    render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );
    expect(screen.queryByText('Choose Account')).not.toBeInTheDocument();
  });

  it('should render ConnectionHelpDialog (closed by default, no crash)', () => {
    render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );
    expect(screen.queryByText('No session found')).not.toBeInTheDocument();
  });

  it('should show ConnectionHelpDialog when isConnectHelpOpen is true', () => {
    useAuthStore.setState({ isConnectHelpOpen: true, cookieWarning: null });
    render(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );
    expect(screen.getByText('No session found')).toBeInTheDocument();
  });
});
