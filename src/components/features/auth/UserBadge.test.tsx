import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserBadge } from './UserBadge';
import { useAuthStore } from '@/stores/authStore';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValueOrOptions?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'auth.signedInAs': 'Signed in as {{username}}',
        'auth.accessibilityStatus': 'Signed in as {{username}}, Go+ quality enabled',
        'auth.qualityBadge': 'Go+ 256kbps',
        'auth.loading': 'Loading...',
      };
      const template = translations[key] || (typeof defaultValueOrOptions === 'string' ? defaultValueOrOptions : key);
      if (typeof defaultValueOrOptions === 'object' && defaultValueOrOptions !== null) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(defaultValueOrOptions[k] || ''));
      }
      return template;
    },
  }),
}));

describe('UserBadge', () => {
  beforeEach(() => {
    useAuthStore.setState({ isSignedIn: false, username: null, plan: null });
  });

  it('should display loading state when username is null', () => {
    useAuthStore.setState({ isSignedIn: true, username: null });

    render(<UserBadge />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display username when available', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'marcus_dj' });

    render(<UserBadge />);

    expect(screen.getByText('Signed in as marcus_dj')).toBeInTheDocument();
  });

  it('should display Go+ quality badge when user has a plan', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(<UserBadge />);

    expect(screen.getByText('Go+ 256kbps')).toBeInTheDocument();
  });

  it('should not display Go+ badge when plan is null', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: null });

    render(<UserBadge />);

    expect(screen.queryByText('Go+ 256kbps')).not.toBeInTheDocument();
  });

  it('should not display Go+ badge when plan is "Free"', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Free' });

    render(<UserBadge />);

    expect(screen.queryByText('Go+ 256kbps')).not.toBeInTheDocument();
  });

  it('should have accessible status role', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(<UserBadge />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
  });

  it('should have accessible label for screen readers', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(<UserBadge />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute(
      'aria-label',
      'Signed in as testuser, Go+ quality enabled'
    );
  });

  it('should render user icon as decorative', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    const { container } = render(<UserBadge />);

    const userIcon = container.querySelector('svg.lucide-user');
    expect(userIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('should show loading spinner when username is null', () => {
    useAuthStore.setState({ isSignedIn: true, username: null });

    const { container } = render(<UserBadge />);

    // Lucide icons use lucide-loader-circle class in newer versions
    const spinner = container.querySelector('svg[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply correct badge styling for Go+ badge', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(<UserBadge />);

    const badge = screen.getByText('Go+ 256kbps');
    expect(badge).toHaveClass('bg-sky-100');
    expect(badge).toHaveClass('text-sky-700');
  });
});
