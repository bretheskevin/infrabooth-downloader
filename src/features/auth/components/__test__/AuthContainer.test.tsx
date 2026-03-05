import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthContainer } from '../AuthContainer';
import { useAuthStore } from '@/features/auth/store';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'auth.signInHint': 'Log in to SoundCloud in your browser for higher quality downloads',
        'auth.checkBrowser': 'Check browser login',
        'auth.checking': 'Checking...',
        'auth.qualityBadge': 'Go+ 256kbps',
        'auth.signOut': 'Sign Out',
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
vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
  signOut: vi.fn(),
}));

describe('AuthContainer', () => {
  beforeEach(() => {
    // Reset store to default state
    useAuthStore.setState({ isSignedIn: false, username: null, plan: null });
  });

  it('should render SignInButton when not signed in', () => {
    render(<AuthContainer />);

    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();
  });

  it('should render UserMenu when signed in with username', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(<AuthContainer />);

    // UserMenu shows username and quality badge in a dropdown trigger button
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Go+ 256kbps')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check browser login/i })).not.toBeInTheDocument();
  });

  it('should switch from SignInButton to UserMenu when auth state changes', () => {
    const { rerender } = render(<AuthContainer />);

    // Initially shows check browser login button
    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();

    // Change auth state (wrapped in act)
    act(() => {
      useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });
    });

    // Rerender to pick up state change
    rerender(<AuthContainer />);

    // Now shows user menu with username
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check browser login/i })).not.toBeInTheDocument();
  });

  it('should have transition classes for smooth state changes', () => {
    const { container } = render(<AuthContainer />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('transition-opacity', 'duration-200');
  });
});
