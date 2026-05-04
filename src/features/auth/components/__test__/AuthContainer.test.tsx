import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthContainer } from '../AuthContainer';
import { useAuthStore } from '@/features/auth/store';

// Mock react-i18next
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

    // UserMenu shows username and quality badge in a dropdown trigger button
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

    // Initially shows check browser login button
    expect(screen.getByRole('button', { name: /Check browser login/i })).toBeInTheDocument();

    // Change auth state (wrapped in act)
    act(() => {
      useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });
    });

    // Rerender to pick up state change
    rerender(
      <TooltipProvider>
        <AuthContainer />
      </TooltipProvider>,
    );

    // Now shows user menu with username
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
});
