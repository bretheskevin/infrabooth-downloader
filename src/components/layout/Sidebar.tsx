import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Library, Search, Mail, Bell, Settings, User, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useAuthStore } from '@/features/auth/store';
import { signOut } from '@/features/auth/api';
import { useAuthCheck } from '@/features/auth/hooks/useAuthCheck';
import { useMessagesStore } from '@/features/messages/store';
import { useNotificationsStore } from '@/features/notifications/store';
import { useUnreadConversations } from '@/features/messages/hooks/useUnreadConversations';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { useArtistProfileStore } from '@/features/artist-profile/store';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/features/settings';
import { Separator } from '@/components/ui/separator';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarQueueWidget } from './SidebarQueueWidget';
import { TlsWarningSidebarItem } from './TlsWarningBadge';
import type { AppPage } from './AppLayout';

interface SidebarProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isSignedIn: boolean;
}

export function Sidebar({ activePage, onPageChange, isSignedIn }: SidebarProps) {
  const { t } = useTranslation();
  const appVersion = useAppVersion();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isChecking, handleCheck } = useAuthCheck();

  const { username, avatarUrl, userId } = useAuthStore(
    useShallow((s) => ({
      username: s.username,
      avatarUrl: s.avatarUrl,
      userId: s.userId,
    })),
  );

  const isMessagesOpen = useMessagesStore((s) => s.isPageOpen);
  const isNotificationsOpen = useNotificationsStore((s) => s.isPageOpen);

  const { data: unreadConversationCount } = useUnreadConversations();
  const { data: unreadNotificationsData } = useUnreadNotifications();

  const isOverlayOpen = isMessagesOpen || isNotificationsOpen;

  const handleOpenMessages = () => {
    if (isMessagesOpen) {
      useMessagesStore.getState().clear();
    } else {
      if (isNotificationsOpen) {
        useNotificationsStore.getState().closePage();
      }
      useMessagesStore.getState().openPage();
    }
  };

  const handleOpenNotifications = () => {
    if (isNotificationsOpen) {
      useNotificationsStore.getState().closePage();
    } else {
      if (isMessagesOpen) {
        useMessagesStore.getState().clear();
      }
      useNotificationsStore.getState().openPage();
    }
  };

  function handleOpenProfile() {
    if (userId && username) {
      useArtistProfileStore.getState().openProfile(userId, username);
    }
  }

  const sidebarActionClass =
    'flex items-center gap-2 w-full justify-start px-4 py-2 h-auto text-sm text-foreground/80 hover:bg-secondary rounded-none';

  return (
    <aside data-testid="sidebar" className="w-[232px] shrink-0 border-r border-border bg-card/40 flex flex-col h-full overflow-y-auto pb-2">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-sm font-semibold tracking-tight">{t('app.title')}</h1>
        {appVersion && <span className="text-xs text-muted-foreground">{t('app.version', { version: appVersion })}</span>}
      </div>

      <div className="px-2 py-2">
        <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('sidebar.workspace')}</p>
        <SidebarNavItem
          icon={Link}
          label={t('sidebar.pasteUrl')}
          active={activePage === 'download' && !isOverlayOpen}
          onClick={() => onPageChange('download')}
        />
        <SidebarNavItem
          icon={Library}
          label={t('sidebar.myLibrary')}
          active={activePage === 'library' && !isOverlayOpen}
          locked={!isSignedIn}
          onClick={() => onPageChange('library')}
        />
        <SidebarNavItem
          icon={Search}
          label={t('sidebar.search')}
          active={activePage === 'search' && !isOverlayOpen}
          onClick={() => onPageChange('search')}
        />
      </div>

      {isSignedIn && (
        <div className="px-2 py-2">
          <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('sidebar.activity')}</p>
          <SidebarNavItem
            icon={Mail}
            label={t('sidebar.messages')}
            active={isMessagesOpen}
            badge={typeof unreadConversationCount === 'number' && unreadConversationCount > 0 ? unreadConversationCount : undefined}
            onClick={handleOpenMessages}
          />
          <SidebarNavItem
            icon={Bell}
            label={t('sidebar.notifications')}
            active={isNotificationsOpen}
            badge={unreadNotificationsData?.unread ? 'dot' : undefined}
            onClick={handleOpenNotifications}
          />
        </div>
      )}

      <div className="mt-auto">
        <SidebarQueueWidget />
        <Separator />

        {isSignedIn && (
          <Button variant="ghost" onClick={handleOpenProfile} className={sidebarActionClass}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <User className="size-6 rounded-full bg-muted p-0.5" />
            )}
            <span className="truncate">{username}</span>
          </Button>
        )}

        <TlsWarningSidebarItem className={sidebarActionClass} />

        <Button variant="ghost" onClick={() => setSettingsOpen(true)} className={sidebarActionClass}>
          <Settings className="size-4" />
          <span>{t('sidebar.settings')}</span>
        </Button>

        {isSignedIn ? (
          <Button variant="ghost" onClick={() => void signOut()} className={sidebarActionClass}>
            <LogOut className="size-4" />
            <span>{t('auth.signOut')}</span>
          </Button>
        ) : (
          <Button variant="ghost" onClick={handleCheck} disabled={isChecking} className={sidebarActionClass}>
            {isChecking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span>{isChecking ? t('auth.checking') : t('auth.checkBrowser')}</span>
          </Button>
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}
