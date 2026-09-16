import { useCallback } from 'react';
import { useTrackListContextOptional } from '@/components/track-list-context';
import { Ban, Heart, Link, ExternalLink, FolderOpen, ListPlus, MoreVertical, Send, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { PlaylistPickerSubmenu } from '@/components/PlaylistPickerSubmenu';
import type { LikeState } from '@/hooks/useLikeTrack';
import { useMessagesStore } from '@/features/messages/store';
import { usePlayerStore, buildPlaybackQueue } from '@/features/player';
import type { TrackInfo } from '@/bindings';
import { useDownloadStateStore } from '@/hooks/useDownloadState';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { useLinkActions } from '@/hooks/useLinkActions';
import { useIsSignedIn } from '@/features/auth/store';
import { useTrackExclusion } from '@/features/rekordbox-export/hooks/useTrackExclusion';

function useTrackRemoval(track: TrackInfo): (() => void) | undefined {
  const ctx = useTrackListContextOptional();
  const removeFromPlaylist = ctx?.removeFromPlaylist;
  const handleRemove = useCallback(() => {
    removeFromPlaylist?.(track);
  }, [removeFromPlaylist, track]);
  return removeFromPlaylist ? handleRemove : undefined;
}

export interface TrackMenuItemsProps {
  track: TrackInfo;
  onCloseMenu?: () => void;
  likeState?: LikeState;
}

export function LinkContextMenuItems({ onCopyLink, onOpenInBrowser }: { onCopyLink: () => void; onOpenInBrowser: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <MenuItem onClick={onCopyLink}>
        <Link className="h-4 w-4" />
        {t('trackMenu.copyLink')}
      </MenuItem>
      <MenuItem onClick={onOpenInBrowser}>
        <ExternalLink className="h-4 w-4" />
        {t('trackMenu.openInBrowser')}
      </MenuItem>
    </>
  );
}

export function TrackMenuItems({ track, onCloseMenu, likeState }: TrackMenuItemsProps) {
  const { t } = useTranslation();
  const isSignedIn = useIsSignedIn();
  const { handleCopyLink, handleOpenInBrowser } = useLinkActions(track.permalink_url);
  const filePath = useDownloadStateStore((s) => s.states.get(String(track.id))?.filePath);
  const onOpenFileLocation = useOpenDownloadFolder(filePath ?? null);
  const { isExcluded, toggle: onToggleExcluded } = useTrackExclusion(track.id);
  const onRemoveFromPlaylist = useTrackRemoval(track);

  const shareInfo = {
    trackId: track.id,
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url,
    permalinkUrl: track.permalink_url,
  };

  const handleShareByDm = () => {
    useMessagesStore.getState().openShareDialog(shareInfo);
    onCloseMenu?.();
  };

  const handleAddToQueue = () => {
    const [item] = buildPlaybackQueue([track]);
    if (item) usePlayerStore.getState().addToQueue(item);
  };

  return (
    <>
      <MenuItem onClick={handleCopyLink}>
        <Link className="h-4 w-4" />
        {t('trackMenu.copyLink')}
      </MenuItem>
      <MenuItem onClick={handleOpenInBrowser}>
        <ExternalLink className="h-4 w-4" />
        {t('trackMenu.openInBrowser')}
      </MenuItem>
      {filePath && (
        <MenuItem onClick={onOpenFileLocation}>
          <FolderOpen className="h-4 w-4" />
          {t('trackMenu.openFileLocation')}
        </MenuItem>
      )}
      {onToggleExcluded && (
        <>
          <MenuSeparator />
          <MenuItem onClick={onToggleExcluded}>
            <Ban className="h-4 w-4" />
            {t(isExcluded ? 'trackMenu.includeInExport' : 'trackMenu.excludeFromExport')}
          </MenuItem>
        </>
      )}
      {isSignedIn && (
        <>
          <MenuSeparator />
          {likeState && (
            <MenuItem onClick={likeState.onToggle} disabled={likeState.isLoading}>
              <Heart className={cn('h-4 w-4', likeState.isLiked && 'fill-primary text-primary')} />
              {t(likeState.isLiked ? 'trackMenu.unlike' : 'trackMenu.like')}
            </MenuItem>
          )}
          <MenuItem onClick={handleAddToQueue}>
            <ListPlus className="h-4 w-4" />
            {t('trackMenu.addToQueue')}
          </MenuItem>
          <PlaylistPickerSubmenu trackId={track.id} onSuccess={onCloseMenu} />
          <MenuItem onClick={handleShareByDm}>
            <Send className="h-4 w-4" />
            {t('trackMenu.shareByDm')}
          </MenuItem>
          {onRemoveFromPlaylist && (
            <MenuItem onClick={onRemoveFromPlaylist} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              {t('trackMenu.removeFromPlaylist')}
            </MenuItem>
          )}
        </>
      )}
    </>
  );
}

interface TrackRowActionsContextContentProps {
  track: TrackInfo;
  onCloseMenu: () => void;
  likeState?: LikeState;
}

export function TrackRowActionsContextContent({ track, onCloseMenu, likeState }: TrackRowActionsContextContentProps) {
  return (
    <MenuContent>
      <TrackMenuItems track={track} onCloseMenu={onCloseMenu} likeState={likeState} />
    </MenuContent>
  );
}

interface TrackRowActionsDropdownProps {
  track: TrackInfo;
  dropdownMenuOpen: boolean;
  onDropdownMenuOpenChange: (open: boolean) => void;
  actionSlot?: React.ReactNode;
  likeState?: LikeState;
}

export function TrackRowActionsDropdown({
  track,
  dropdownMenuOpen,
  onDropdownMenuOpenChange,
  actionSlot,
  likeState,
}: TrackRowActionsDropdownProps) {
  const closeMenu = useCallback(() => onDropdownMenuOpenChange(false), [onDropdownMenuOpenChange]);

  return (
    <div className="flex-shrink-0 flex items-center justify-end gap-1 min-w-[32px]">
      {actionSlot}
      <Menu variant="dropdown" open={dropdownMenuOpen} onOpenChange={onDropdownMenuOpenChange}>
        <MenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </MenuTrigger>
        <MenuContent align="end">
          <TrackMenuItems track={track} onCloseMenu={closeMenu} likeState={likeState} />
        </MenuContent>
      </Menu>
    </div>
  );
}
