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
    sortDirection: 'desc' as const,
    onSortDirectionChange: vi.fn(),
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

  it('shows sort direction when showSortDirection is true', () => {
    const { container } = render(<ProfileTabs {...defaults} showSortDirection />);
    const sortDiv = container.querySelector('[class*="flex items-center gap-2"]');
    expect(sortDiv).not.toHaveClass('opacity-0');
    expect(sortDiv).not.toHaveAttribute('inert');
  });

  it('hides sort direction with inert when showSortDirection is false', () => {
    const { container } = render(<ProfileTabs {...defaults} showSortDirection={false} />);
    const sortDiv = container.querySelector('.opacity-0');
    expect(sortDiv).toBeInTheDocument();
    expect(sortDiv).toHaveAttribute('inert');
  });
});
