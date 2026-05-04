import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '@/features/auth/store';
import { useQueueStore } from '@/features/queue/store';
import { useMessagesStore } from '@/features/messages/store';
import { useNotificationsStore } from '@/features/notifications/store';
import { createQueryWrapper } from '@/test/queryWrapper';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'app.title': 'InfraBooth Downloader',
        'app.version': `Downloader · ${params?.version}`,
        'sidebar.workspace': 'Workspace',
        'sidebar.activity': 'Activity',
        'sidebar.pasteUrl': 'Paste a link',
        'sidebar.myLibrary': 'My Library',
        'sidebar.search': 'Search',
        'sidebar.messages': 'Messages',
        'sidebar.notifications': 'Notifications',
        'sidebar.settings': 'Settings',
        'sidebar.noActiveDownload': 'No active download',
        'sidebar.downloading': 'Downloading...',
        'sidebar.queueProgress': `${params?.completed}/${params?.total}`,
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('1.6.0'),
}));

vi.mock('@/features/messages/hooks/useUnreadConversations', () => ({
  useUnreadConversations: () => ({ data: 3 }),
}));

vi.mock('@/features/notifications/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: () => ({ data: { unread: true, count: 2 } }),
}));

vi.mock('@/features/settings/hooks/useMenuSettingsListener', () => ({
  useMenuSettingsListener: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const QueryWrapper = createQueryWrapper();

describe('Sidebar', () => {
  const defaultProps = {
    activePage: 'download' as const,
    onPageChange: vi.fn(),
    isSignedIn: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isSignedIn: false,
      userId: null,
      username: null,
      plan: null,
      avatarUrl: null,
      cookieWarning: null,
    });
    useQueueStore.setState({
      tracks: [],
      currentIndex: 0,
      totalTracks: 0,
      isProcessing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,
    });
    useMessagesStore.setState({
      isPageOpen: false,
      selectedConversation: null,
      selectedPlaylist: null,
      shareDialogTrack: null,
    });
    useNotificationsStore.setState({
      isPageOpen: false,
      selectedPlaylist: null,
    });
  });

  it('should render the app title', () => {
    render(<Sidebar {...defaultProps} />, { wrapper: QueryWrapper });
    expect(screen.getByText('InfraBooth Downloader')).toBeInTheDocument();
  });

  it('should render workspace section with navigation items', () => {
    render(<Sidebar {...defaultProps} />, { wrapper: QueryWrapper });
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Paste a link')).toBeInTheDocument();
    expect(screen.getByText('My Library')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should render activity section when signed in', () => {
    render(<Sidebar {...defaultProps} isSignedIn />, { wrapper: QueryWrapper });
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should NOT render activity section when not signed in', () => {
    render(<Sidebar {...defaultProps} isSignedIn={false} />, { wrapper: QueryWrapper });
    expect(screen.queryByText('Activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Messages')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('should mark download as active when on download page', () => {
    render(<Sidebar {...defaultProps} activePage="download" />, {
      wrapper: QueryWrapper,
    });
    const downloadButton = screen.getByText('Paste a link').closest('button');
    expect(downloadButton?.className).toContain('bg-primary/10');
  });

  it('should mark library as active when on library page', () => {
    render(<Sidebar {...defaultProps} activePage="library" isSignedIn />, {
      wrapper: QueryWrapper,
    });
    const libraryButton = screen.getByText('My Library').closest('button');
    expect(libraryButton?.className).toContain('bg-primary/10');
  });

  it('should lock library when not signed in', () => {
    render(<Sidebar {...defaultProps} isSignedIn={false} />, {
      wrapper: QueryWrapper,
    });
    const libraryButton = screen.getByText('My Library').closest('button');
    expect(libraryButton).toBeDisabled();
  });

  it('should call onPageChange when workspace item is clicked', () => {
    const onPageChange = vi.fn();
    render(<Sidebar {...defaultProps} onPageChange={onPageChange} />, {
      wrapper: QueryWrapper,
    });
    fireEvent.click(screen.getByText('Paste a link'));
    expect(onPageChange).toHaveBeenCalledWith('download');
  });

  it('should show queue widget', () => {
    render(<Sidebar {...defaultProps} />, { wrapper: QueryWrapper });
    expect(screen.getByText('No active download')).toBeInTheDocument();
  });

  it('should render settings button', () => {
    render(<Sidebar {...defaultProps} />, { wrapper: QueryWrapper });
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should show messages as active when messages page is open', () => {
    useMessagesStore.setState({ isPageOpen: true });
    render(<Sidebar {...defaultProps} isSignedIn />, { wrapper: QueryWrapper });
    const messagesButton = screen.getByText('Messages').closest('button');
    expect(messagesButton?.className).toContain('bg-primary/10');
  });

  it('should show notifications as active when notifications page is open', () => {
    useNotificationsStore.setState({ isPageOpen: true });
    render(<Sidebar {...defaultProps} isSignedIn />, { wrapper: QueryWrapper });
    const notificationsButton = screen.getByText('Notifications').closest('button');
    expect(notificationsButton?.className).toContain('bg-primary/10');
  });
});
