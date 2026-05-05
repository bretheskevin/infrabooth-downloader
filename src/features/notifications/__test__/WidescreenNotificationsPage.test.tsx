import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NotificationItem } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'notifications.title': 'Notifications',
        'notifications.subtitle': 'Activity from your artists and friends.',
        'notifications.filter.all': 'All',
        'notifications.filter.mentions': 'Mentions',
        'notifications.filter.likes': 'Likes',
        'notifications.filter.follows': 'Follows',
        'notifications.empty': 'No notifications yet',
        'notifications.error': "Couldn't load notifications",
        'notifications.retry': 'Retry',
      };
      return map[key] ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockNotificationsPage = {
  items: [] as NotificationItem[],
  isLoading: false,
  error: null as Error | null,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
};

vi.mock('../hooks/useNotificationsPage', () => ({
  useNotificationsPage: () => mockNotificationsPage,
}));

vi.mock('../hooks/useMarkNotificationsSeen', () => ({
  useMarkNotificationsSeen: vi.fn(),
}));

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('../components/NotificationRow', () => ({
  NotificationRow: ({ item }: { item: NotificationItem }) => <div data-testid={`row-${item.id}`} data-kind={item.kind} />,
}));

vi.mock('@/components/FilterChips', () => ({
  FilterChips: ({
    options,
    active,
    onChange,
  }: {
    options: readonly { key: string; label: string }[];
    active: string;
    onChange: (key: string) => void;
  }) => (
    <div data-testid="filter-chips">
      {options.map(({ key, label }) => (
        <button key={key} data-testid={`chip-${key}`} data-active={key === active} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  ),
}));

import { WidescreenNotificationsPage } from '../components/WidescreenNotificationsPage';

function makeActor(username = 'user') {
  return { id: 1, username, avatar_url: null, permalink_url: '' };
}

function makeTrack(title = 'Track') {
  return {
    id: 1,
    title,
    user: { id: 1, username: 'artist', avatar_url: null, permalink_url: '' },
    artwork_url: null,
    duration: 180000,
    permalink_url: '',
    waveform_url: null,
    downloadable: false,
    download_url: null,
  };
}

describe('WidescreenNotificationsPage', () => {
  beforeEach(() => {
    mockNotificationsPage.items = [];
    mockNotificationsPage.isLoading = false;
    mockNotificationsPage.error = null;
    vi.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    render(<WidescreenNotificationsPage />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Activity from your artists and friends.')).toBeInTheDocument();
  });

  it('renders filter chips', () => {
    render(<WidescreenNotificationsPage />);
    expect(screen.getByTestId('filter-chips')).toBeInTheDocument();
    expect(screen.getByTestId('chip-all')).toBeInTheDocument();
    expect(screen.getByTestId('chip-mentions')).toBeInTheDocument();
    expect(screen.getByTestId('chip-likes')).toBeInTheDocument();
    expect(screen.getByTestId('chip-follows')).toBeInTheDocument();
  });

  it('does not render mark all as read button', () => {
    render(<WidescreenNotificationsPage />);
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<WidescreenNotificationsPage />);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    mockNotificationsPage.isLoading = true;
    const { container } = render(<WidescreenNotificationsPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    mockNotificationsPage.error = new Error('fail');
    render(<WidescreenNotificationsPage />);
    expect(screen.getByText("Couldn't load notifications")).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders notification rows', () => {
    mockNotificationsPage.items = [
      { kind: 'affiliation', id: '1', created_at: new Date().toISOString(), actor: makeActor() },
      { kind: 'track_like', id: '2', created_at: new Date().toISOString(), actor: makeActor(), track: makeTrack() },
    ];
    render(<WidescreenNotificationsPage />);
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
  });

  it('filters by mentions when chip is clicked', async () => {
    mockNotificationsPage.items = [
      { kind: 'affiliation', id: '1', created_at: new Date().toISOString(), actor: makeActor() },
      { kind: 'mention', id: '2', created_at: new Date().toISOString(), actor: makeActor(), track: makeTrack(), body: 'hey' },
      { kind: 'comment', id: '3', created_at: new Date().toISOString(), actor: makeActor(), track: makeTrack(), body: 'nice' },
    ];
    render(<WidescreenNotificationsPage />);
    await userEvent.click(screen.getByTestId('chip-mentions'));
    expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
    expect(screen.getByTestId('row-3')).toBeInTheDocument();
  });

  it('filters by likes when chip is clicked', async () => {
    mockNotificationsPage.items = [
      { kind: 'affiliation', id: '1', created_at: new Date().toISOString(), actor: makeActor() },
      { kind: 'track_like', id: '2', created_at: new Date().toISOString(), actor: makeActor(), track: makeTrack() },
    ];
    render(<WidescreenNotificationsPage />);
    await userEvent.click(screen.getByTestId('chip-likes'));
    expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
  });

  it('filters by follows when chip is clicked', async () => {
    mockNotificationsPage.items = [
      { kind: 'affiliation', id: '1', created_at: new Date().toISOString(), actor: makeActor() },
      { kind: 'track_like', id: '2', created_at: new Date().toISOString(), actor: makeActor(), track: makeTrack() },
    ];
    render(<WidescreenNotificationsPage />);
    await userEvent.click(screen.getByTestId('chip-follows'));
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.queryByTestId('row-2')).not.toBeInTheDocument();
  });

  it('shows all items when "all" chip is selected', async () => {
    mockNotificationsPage.items = [
      { kind: 'affiliation', id: '1', created_at: new Date().toISOString(), actor: makeActor() },
      { kind: 'track_like', id: '2', created_at: new Date().toISOString(), actor: makeActor(), track: makeTrack() },
    ];
    render(<WidescreenNotificationsPage />);
    await userEvent.click(screen.getByTestId('chip-follows'));
    await userEvent.click(screen.getByTestId('chip-all'));
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
  });
});
