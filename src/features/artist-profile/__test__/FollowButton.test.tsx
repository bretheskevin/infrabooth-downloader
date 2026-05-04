import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockFollowState = {
  isFollowing: false,
  isLoading: false,
  isChecking: false,
  toggle: vi.fn(),
};

vi.mock('../hooks/useFollowArtist', () => ({
  useFollowArtist: () => mockFollowState,
}));

const mockAuthState = {
  isSignedIn: true,
  username: 'currentUser',
};

vi.mock('@/features/auth/store', () => ({
  useIsSignedIn: () => mockAuthState.isSignedIn,
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) => selector(mockAuthState),
}));

describe('FollowButton', () => {
  beforeEach(() => {
    mockFollowState.isFollowing = false;
    mockFollowState.isLoading = false;
    mockFollowState.isChecking = false;
    mockFollowState.toggle = vi.fn();
    mockAuthState.isSignedIn = true;
    mockAuthState.username = 'currentUser';
  });

  async function renderButton(props?: { artistUsername?: string }) {
    const { FollowButton } = await import('../components/FollowButton');
    return render(<FollowButton artistId={42} artistUsername={props?.artistUsername ?? 'otherArtist'} />);
  }

  it('renders Follow when not following', async () => {
    await renderButton();
    expect(screen.getByText('artistProfile.follow')).toBeInTheDocument();
  });

  it('renders Following when following', async () => {
    mockFollowState.isFollowing = true;
    await renderButton();
    expect(screen.getByText('artistProfile.following')).toBeInTheDocument();
  });

  it('calls toggle on click', async () => {
    const user = userEvent.setup();
    await renderButton();
    await user.click(screen.getByRole('button'));
    expect(mockFollowState.toggle).toHaveBeenCalledOnce();
  });

  it('disables button when loading', async () => {
    mockFollowState.isLoading = true;
    await renderButton();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when checking follow status', async () => {
    mockFollowState.isChecking = true;
    await renderButton();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is hidden when not signed in', async () => {
    mockAuthState.isSignedIn = false;
    const { container } = await renderButton();
    expect(container.innerHTML).toBe('');
  });

  it('is hidden when viewing own profile', async () => {
    const { container } = await renderButton({ artistUsername: 'currentUser' });
    expect(container.innerHTML).toBe('');
  });

  it('is visible when viewing a different artist', async () => {
    await renderButton({ artistUsername: 'someoneElse' });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
