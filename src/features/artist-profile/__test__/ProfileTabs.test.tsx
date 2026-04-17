import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProfileTabs } from '../components/ProfileTabs';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ProfileTabs', () => {
  const defaults = {
    activeTab: 'recent' as const,
    onTabChange: vi.fn(),
  };

  it('renders all tab options', () => {
    render(<ProfileTabs {...defaults} />);
    expect(screen.getByText('artistProfile.sortRecent')).toBeInTheDocument();
    expect(screen.getByText('artistProfile.sortPopular')).toBeInTheDocument();
    expect(screen.getByText('artistProfile.playlists')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const onTabChange = vi.fn();
    render(<ProfileTabs {...defaults} onTabChange={onTabChange} />);
    await userEvent.click(screen.getByText('artistProfile.sortPopular'));
    expect(onTabChange).toHaveBeenCalledWith('popular');
  });

});
