import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../UserMenu';
import { useAuthStore } from '@/features/auth/store';

// Mock auth module
vi.mock('@/features/auth/api', () => ({
  signOut: vi.fn(),
  listProfiles: vi.fn().mockResolvedValue([]),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'auth.signOut': 'Sign out',
        'auth.qualityBadge': 'Go+ 256kbps',
        'auth.myProfile': 'My Profile',
        'auth.switchAccount': 'Switch Account',
      };
      return translations[key] || fallback || key;
    },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    trace: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

import { signOut } from '@/features/auth/api';

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
    const svg = trigger.querySelector('svg.lucide-user');
    expect(svg).toBeInTheDocument();
  });

  it('should render chevron down icon', () => {
    render(<UserMenu />);
    const trigger = screen.getByRole('button');
    const svg = trigger.querySelector('svg.lucide-chevron-down');
    expect(svg).toBeInTheDocument();
  });

  it('should export signOut for use by the component', () => {
    expect(mockSignOut).toBeDefined();
  });

  it('should show switch account option in dropdown', async () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: null, avatarUrl: null, userId: 1 });
    render(<UserMenu />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Switch Account')).toBeInTheDocument();
  });
});
