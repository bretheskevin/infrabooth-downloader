import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSelectDialog } from '../ProfileSelectDialog';
import { useAuthStore } from '@/features/auth/store';
import type { ProfileSummary } from '@/bindings';

vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn().mockResolvedValue(true),
  listProfiles: vi.fn().mockResolvedValue([]),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockProfiles: ProfileSummary[] = [
  {
    key: 'Chrome:Profile 1',
    browser: 'Chrome',
    profile: 'Profile 1',
    username: 'dj_cool',
    avatarUrl: 'https://i1.sndcdn.com/avatars-xxx.jpg',
    plan: 'Pro Unlimited',
  },
  {
    key: 'Firefox:default-release',
    browser: 'Firefox',
    profile: 'default-release',
    username: 'producer42',
    avatarUrl: null,
    plan: 'Free',
  },
];

describe('ProfileSelectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isPickerOpen: false,
      profiles: [],
      isLoadingProfiles: false,
      selectedProfileKey: null,
    });
  });

  it('should not render content when closed', () => {
    render(<ProfileSelectDialog />);
    expect(screen.queryByText('auth.profilePicker.title')).not.toBeInTheDocument();
  });

  it('should show title when picker is open', () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: [] });
    render(<ProfileSelectDialog />);
    expect(screen.getByText('auth.profilePicker.title')).toBeInTheDocument();
  });

  it('should render profile rows when profiles are loaded', () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: mockProfiles });
    render(<ProfileSelectDialog />);
    expect(screen.getByText('dj_cool')).toBeInTheDocument();
    expect(screen.getByText('producer42')).toBeInTheDocument();
  });

  it('should show Go+ badge for paid plans', () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: mockProfiles });
    render(<ProfileSelectDialog />);
    expect(screen.getByText('auth.goPlus')).toBeInTheDocument();
  });

  it('should show a spinner while profiles are loading', () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: [], isLoadingProfiles: true });
    render(<ProfileSelectDialog />);
    expect(screen.queryByText('auth.profilePicker.empty')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show an empty message when no profiles are found', () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: [], isLoadingProfiles: false });
    render(<ProfileSelectDialog />);
    expect(screen.getByText('auth.profilePicker.empty')).toBeInTheDocument();
  });

  it('should show browser name in subtitle', () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: mockProfiles });
    render(<ProfileSelectDialog />);
    expect(screen.getByText(/Chrome/)).toBeInTheDocument();
    expect(screen.getByText(/Firefox/)).toBeInTheDocument();
  });

  it('should persist key and close picker when profile is selected', async () => {
    useAuthStore.setState({ isPickerOpen: true, profiles: mockProfiles });

    render(<ProfileSelectDialog />);

    const user = userEvent.setup();
    await user.click(screen.getByText('dj_cool'));

    expect(useAuthStore.getState().selectedProfileKey).toBe('Chrome:Profile 1');
    expect(useAuthStore.getState().isPickerOpen).toBe(false);
  });
});
