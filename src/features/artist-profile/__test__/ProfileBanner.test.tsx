import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProfileBanner } from '../components/ProfileBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => url,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

const mockOpen = vi.fn().mockResolvedValue(undefined);
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));

describe('ProfileBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  const defaults = {
    onBack: vi.fn(),
    isLoading: false,
    bannerUrl: 'https://example.com/banner.jpg',
    avatarUrl: 'https://example.com/avatar.jpg',
    username: 'Test Artist',
    permalinkUrl: 'https://soundcloud.com/test-artist',
  };

  it('renders back button', () => {
    render(<ProfileBanner {...defaults} />);
    expect(screen.getByRole('button', { name: /common\.back/i })).toBeInTheDocument();
  });

  it('calls onBack when back button clicked', async () => {
    const onBack = vi.fn();
    render(<ProfileBanner {...defaults} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<ProfileBanner {...defaults} isLoading={true} />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it('renders banner image when provided', () => {
    render(<ProfileBanner {...defaults} />);
    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/banner.jpg');
  });

  it('renders username', () => {
    render(<ProfileBanner {...defaults} />);
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('renders gradient background without banner', () => {
    const { container } = render(<ProfileBanner {...defaults} bannerUrl={null} />);
    expect(container.querySelector('[class*="bg-gradient"]')).toBeInTheDocument();
    expect(screen.queryByAltText('')).not.toBeInTheDocument();
  });

  it('shows context menu with open in browser on right-click', async () => {
    render(<ProfileBanner {...defaults} />);
    const artistName = screen.getByText('Test Artist');
    await userEvent.pointer({ keys: '[MouseRight]', target: artistName });
    expect(await screen.findByText('trackMenu.openInBrowser')).toBeInTheDocument();
    expect(screen.getByText('trackMenu.copyLink')).toBeInTheDocument();
  });

  it('opens browser when "Open in browser" is clicked', async () => {
    render(<ProfileBanner {...defaults} />);
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('Test Artist') });
    await userEvent.click(await screen.findByText('trackMenu.openInBrowser'));
    expect(mockOpen).toHaveBeenCalledWith('https://soundcloud.com/test-artist');
  });

  it('copies link when "Copy link" is clicked', async () => {
    render(<ProfileBanner {...defaults} />);
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('Test Artist') });
    await userEvent.click(await screen.findByText('trackMenu.copyLink'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://soundcloud.com/test-artist');
  });
});
