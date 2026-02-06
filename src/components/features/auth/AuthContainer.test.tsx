import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthContainer } from './AuthContainer';
import { useAuthStore } from '@/stores/authStore';

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

  it('should render UserBadge when signed in', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser' });

    render(<AuthContainer />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
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

    // Now shows user badge
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with SoundCloud' })).not.toBeInTheDocument();
  });

  it('should show fallback text when signed in without username', () => {
    useAuthStore.setState({ isSignedIn: true, username: null });

    render(<AuthContainer />);

    expect(screen.getByText('Signed in')).toBeInTheDocument();
  });
});
