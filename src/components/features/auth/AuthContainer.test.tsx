import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthContainer } from './AuthContainer';
import { useAuthStore } from '@/stores/authStore';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign in with SoundCloud',
        'auth.openingBrowser': 'Opening browser...',
        'auth.signedInAs': 'Signed in as {{username}}',
        'auth.accessibilityStatus': 'Signed in as {{username}}, Go+ quality enabled',
        'auth.qualityBadge': 'Go+ 256kbps',
        'auth.loading': 'Loading...',
      };
      const template = translations[key] || key;
      if (options) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(options[k] || ''));
      }
      return template;
    },
  }),
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
  startOAuth: vi.fn(),
}));

describe('AuthContainer', () => {
  beforeEach(() => {
    // Reset store to default state
    useAuthStore.setState({ isSignedIn: false, username: null });
  });

  it('should render SignInButton when not signed in', () => {
    render(<AuthContainer />);

    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).toBeInTheDocument();
  });

  it('should render UserBadge when signed in with username', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser' });

    render(<AuthContainer />);

    expect(screen.getByText('Signed in as testuser')).toBeInTheDocument();
    expect(screen.getByText('Go+ 256kbps')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with SoundCloud' })).not.toBeInTheDocument();
  });

  it('should switch from SignInButton to UserBadge when auth state changes', () => {
    const { rerender } = render(<AuthContainer />);

    // Initially shows sign-in button
    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).toBeInTheDocument();

    // Change auth state (wrapped in act)
    act(() => {
      useAuthStore.setState({ isSignedIn: true, username: 'testuser' });
    });

    // Rerender to pick up state change
    rerender(<AuthContainer />);

    // Now shows user badge with username
    expect(screen.getByText('Signed in as testuser')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with SoundCloud' })).not.toBeInTheDocument();
  });

  it('should show loading state when signed in without username', () => {
    useAuthStore.setState({ isSignedIn: true, username: null });

    render(<AuthContainer />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
