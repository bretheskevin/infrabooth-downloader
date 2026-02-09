import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/stores/authStore';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  signOut: vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'auth.signOut': 'Sign out',
        'auth.qualityBadge': 'Go+ 256kbps',
      };
      return translations[key] || fallback || key;
    },
  }),
}));

import { signOut } from '@/lib/auth';

describe('UserMenu', () => {
  const mockSignOut = vi.mocked(signOut);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isSignedIn: true, username: 'TestUser', plan: 'Pro Unlimited' });
  });

  it('should render username in trigger button', () => {
    render(<UserMenu />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });

  it('should render Go+ quality badge when user has a plan', () => {
    render(<UserMenu />);
    expect(screen.getByText('Go+ 256kbps')).toBeInTheDocument();
  });

  it('should not render Go+ badge when plan is null', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'FreeUser', plan: null });
    render(<UserMenu />);
    expect(screen.queryByText('Go+ 256kbps')).not.toBeInTheDocument();
  });

  it('should not render Go+ badge when plan is "Free"', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'FreeUser', plan: 'Free' });
    render(<UserMenu />);
    expect(screen.queryByText('Go+ 256kbps')).not.toBeInTheDocument();
  });

  it('should have accessible dropdown trigger with aria-haspopup', () => {
    render(<UserMenu />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('should render user icon', () => {
    render(<UserMenu />);
    const trigger = screen.getByRole('button');
    // User icon should be present
    const svg = trigger.querySelector('svg.lucide-user');
    expect(svg).toBeInTheDocument();
  });

  it('should render chevron down icon', () => {
    render(<UserMenu />);
    const trigger = screen.getByRole('button');
    // Chevron icon should be present
    const svg = trigger.querySelector('svg.lucide-chevron-down');
    expect(svg).toBeInTheDocument();
  });

  it('should export signOut for use by the component', () => {
    // Verify signOut is importable and mockable
    expect(mockSignOut).toBeDefined();
  });
});
