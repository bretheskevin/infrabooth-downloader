import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  Library,
  Search,
  Mail,
  Bell,
  Settings,
  User,
} from "lucide-react";
import { useAppVersion } from "@/hooks/useAppVersion";
import { useAuthStore } from "@/features/auth/store";
import { useMessagesStore } from "@/features/messages/store";
import { useNotificationsStore } from "@/features/notifications/store";
import { useUnreadConversations } from "@/features/messages/hooks/useUnreadConversations";
import { useUnreadNotifications } from "@/features/notifications/hooks/useUnreadNotifications";
import { useArtistProfileStore } from "@/features/artist-profile/store";
import { SettingsDialog } from "@/features/settings";
import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarQueueWidget } from "./SidebarQueueWidget";
import type { AppPage } from "./AppLayout";

interface SidebarProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isSignedIn: boolean;
}

export function Sidebar({
  activePage,
  onPageChange,
  isSignedIn,
}: SidebarProps) {
  const { t } = useTranslation();
  const appVersion = useAppVersion();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const username = useAuthStore((s) => s.username);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);
  const userId = useAuthStore((s) => s.userId);

  const isMessagesOpen = useMessagesStore((s) => s.isPageOpen);
  const isNotificationsOpen = useNotificationsStore((s) => s.isPageOpen);

  const { data: unreadConversationCount } = useUnreadConversations();
  const { data: unreadNotificationsData } = useUnreadNotifications();

  const isOverlayOpen = isMessagesOpen || isNotificationsOpen;

  const handleOpenMessages = useCallback(() => {
    useMessagesStore.getState().openPage();
  }, []);

  const handleOpenNotifications = useCallback(() => {
    useNotificationsStore.getState().openPage();
  }, []);

  const handleOpenProfile = useCallback(() => {
    if (userId && username) {
      useArtistProfileStore.getState().openProfile(userId, username);
    }
  }, [userId, username]);

  return (
    <aside
      data-testid="sidebar"
      className="w-[232px] shrink-0 border-r border-border bg-card/40 flex flex-col h-full overflow-y-auto"
    >
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-sm font-semibold tracking-tight">
          {t("app.title")}
        </h1>
        {appVersion && (
          <span className="text-xs text-muted-foreground">
            {t("app.version", { version: appVersion })}
          </span>
        )}
      </div>

      <div className="px-2 py-2">
        <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {t("sidebar.workspace")}
        </p>
        <SidebarNavItem
          icon={Link}
          label={t("sidebar.pasteUrl")}
          active={activePage === "download" && !isOverlayOpen}
          onClick={() => onPageChange("download")}
        />
        <SidebarNavItem
          icon={Library}
          label={t("sidebar.myLibrary")}
          active={activePage === "library" && !isOverlayOpen}
          locked={!isSignedIn}
          onClick={() => onPageChange("library")}
        />
        <SidebarNavItem
          icon={Search}
          label={t("sidebar.search")}
          active={activePage === "search" && !isOverlayOpen}
          onClick={() => onPageChange("search")}
        />
      </div>

      <div className="px-2 py-2">
        <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {t("sidebar.activity")}
        </p>
        <SidebarNavItem
          icon={Mail}
          label={t("sidebar.messages")}
          active={isMessagesOpen}
          badge={
            typeof unreadConversationCount === "number" &&
            unreadConversationCount > 0
              ? unreadConversationCount
              : undefined
          }
          onClick={handleOpenMessages}
        />
        <SidebarNavItem
          icon={Bell}
          label={t("sidebar.notifications")}
          active={isNotificationsOpen}
          badge={unreadNotificationsData?.unread ? "dot" : undefined}
          onClick={handleOpenNotifications}
        />
      </div>

      <div className="mt-auto">
        <SidebarQueueWidget />
        <Separator />

        {isSignedIn && (
          <button
            type="button"
            onClick={handleOpenProfile}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground/80 hover:bg-secondary transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-6 rounded-full object-cover"
              />
            ) : (
              <User className="size-6 rounded-full bg-muted p-0.5" />
            )}
            <span className="truncate">{username}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground/80 hover:bg-secondary transition-colors"
        >
          <Settings className="size-4" />
          <span>{t("sidebar.settings")}</span>
        </button>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}
