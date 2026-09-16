import { useCallback } from 'react';
import { useTrackListContextOptional } from '@/components/track-list-context';
import { Ban, Heart, Link, ExternalLink, FolderOpen, ListPlus, MoreVertical, Send, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  variant: 'context' | 'dropdown';
  onCloseMenu?: () => void;
  likeState?: LikeState;
}

export function LinkContextMenuItems({ onCopyLink, onOpenInBrowser }: { onCopyLink: () => void; onOpenInBrowser: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <ContextMenuItem onClick={onCopyLink}>
        <Link className="mr-2 h-4 w-4" />
        {t('trackMenu.copyLink')}
      </ContextMenuItem>
      <ContextMenuItem onClick={onOpenInBrowser}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {t('trackMenu.openInBrowser')}
      </ContextMenuItem>
    </>
  );
}

export function TrackMenuItems({ track, variant, onCloseMenu, likeState }: TrackMenuItemsProps) {
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

  if (variant === 'context') {
    return (
      <>
        <ContextMenuItem onClick={handleCopyLink}>
          <Link className="mr-2 h-4 w-4" />
          {t('trackMenu.copyLink')}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInBrowser}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('trackMenu.openInBrowser')}
        </ContextMenuItem>
        {filePath && (
          <ContextMenuItem onClick={onOpenFileLocation}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {t('trackMenu.openFileLocation')}
          </ContextMenuItem>
        )}
        {onToggleExcluded && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onToggleExcluded}>
              <Ban className="mr-2 h-4 w-4" />
              {t(isExcluded ? 'trackMenu.includeInExport' : 'trackMenu.excludeFromExport')}
            </ContextMenuItem>
          </>
        )}
        {isSignedIn && (
          <>
            <ContextMenuSeparator />
            {likeState && (
              <ContextMenuItem onClick={likeState.onToggle} disabled={likeState.isLoading}>
                <Heart className={cn('mr-2 h-4 w-4', likeState.isLiked && 'fill-primary text-primary')} />
                {t(likeState.isLiked ? 'trackMenu.unlike' : 'trackMenu.like')}
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={handleAddToQueue}>
              <ListPlus className="mr-2 h-4 w-4" />
              {t('trackMenu.addToQueue')}
            </ContextMenuItem>
            <PlaylistPickerSubmenu trackId={track.id} variant="context" onSuccess={onCloseMenu} />
            <ContextMenuItem onClick={handleShareByDm}>
              <Send className="mr-2 h-4 w-4" />
              {t('trackMenu.shareByDm')}
            </ContextMenuItem>
            {onRemoveFromPlaylist && (
              <ContextMenuItem onClick={onRemoveFromPlaylist} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('trackMenu.removeFromPlaylist')}
              </ContextMenuItem>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenuItem onClick={handleCopyLink}>
        <Link className="h-4 w-4" />
        {t('trackMenu.copyLink')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleOpenInBrowser}>
        <ExternalLink className="h-4 w-4" />
        {t('trackMenu.openInBrowser')}
      </DropdownMenuItem>
      {filePath && (
        <DropdownMenuItem onClick={onOpenFileLocation}>
          <FolderOpen className="h-4 w-4" />
          {t('trackMenu.openFileLocation')}
        </DropdownMenuItem>
      )}
      {onToggleExcluded && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleExcluded}>
            <Ban className="h-4 w-4" />
            {t(isExcluded ? 'trackMenu.includeInExport' : 'trackMenu.excludeFromExport')}
          </DropdownMenuItem>
        </>
      )}
      {isSignedIn && (
        <>
          <DropdownMenuSeparator />
          {likeState && (
            <DropdownMenuItem onClick={likeState.onToggle} disabled={likeState.isLoading}>
              <Heart className={cn('h-4 w-4', likeState.isLiked && 'fill-primary text-primary')} />
              {t(likeState.isLiked ? 'trackMenu.unlike' : 'trackMenu.like')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleAddToQueue}>
            <ListPlus className="h-4 w-4" />
            {t('trackMenu.addToQueue')}
          </DropdownMenuItem>
          <PlaylistPickerSubmenu trackId={track.id} variant="dropdown" onSuccess={onCloseMenu} />
          <DropdownMenuItem onClick={handleShareByDm}>
            <Send className="h-4 w-4" />
            {t('trackMenu.shareByDm')}
          </DropdownMenuItem>
          {onRemoveFromPlaylist && (
            <DropdownMenuItem onClick={onRemoveFromPlaylist} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              {t('trackMenu.removeFromPlaylist')}
            </DropdownMenuItem>
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
    <ContextMenuContent>
      <TrackMenuItems track={track} variant="context" onCloseMenu={onCloseMenu} likeState={likeState} />
    </ContextMenuContent>
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
      <DropdownMenu open={dropdownMenuOpen} onOpenChange={onDropdownMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <TrackMenuItems track={track} variant="dropdown" onCloseMenu={closeMenu} likeState={likeState} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
