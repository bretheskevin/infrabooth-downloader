import { useCallback } from 'react';
import { Heart, Link, ExternalLink, FolderOpen, ListPlus, MoreVertical, Send, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
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
import { useMessagesStore, type ShareTrackInfo } from '@/features/messages/store';

export interface TrackMenuItemsProps {
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  onOpenFileLocation?: () => void;
  isSignedIn: boolean;
  trackId: number;
  variant: 'context' | 'dropdown';
  onCloseMenu?: () => void;
  onRemoveFromPlaylist?: () => void;
  onAddToQueue?: () => void;
  likeState?: LikeState;
  shareInfo?: ShareTrackInfo;
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

export function TrackMenuItems({ onCopyLink, onOpenInBrowser, onOpenFileLocation, isSignedIn, trackId, variant, onCloseMenu, onRemoveFromPlaylist, onAddToQueue, likeState, shareInfo }: TrackMenuItemsProps) {
  const { t } = useTranslation();

  const handleShareByDm = () => {
    if (!shareInfo) return;
    useMessagesStore.getState().openShareDialog(shareInfo);
    onCloseMenu?.();
  };

  const canShare = isSignedIn && !!shareInfo;

  if (variant === 'context') {
    return (
      <>
        <LinkContextMenuItems onCopyLink={onCopyLink} onOpenInBrowser={onOpenInBrowser} />
        {onOpenFileLocation && (
          <ContextMenuItem onClick={onOpenFileLocation}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {t('trackMenu.openFileLocation')}
          </ContextMenuItem>
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
            {onAddToQueue && (
              <ContextMenuItem onClick={onAddToQueue}>
                <ListPlus className="mr-2 h-4 w-4" />
                {t('trackMenu.addToQueue')}
              </ContextMenuItem>
            )}
            <PlaylistPickerSubmenu trackId={trackId} variant="context" onSuccess={onCloseMenu} />
            {canShare && (
              <ContextMenuItem onClick={handleShareByDm}>
                <Send className="mr-2 h-4 w-4" />
                {t('trackMenu.shareByDm')}
              </ContextMenuItem>
            )}
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
      <DropdownMenuItem onClick={onCopyLink}>
        <Link className="h-4 w-4" />
        {t('trackMenu.copyLink')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onOpenInBrowser}>
        <ExternalLink className="h-4 w-4" />
        {t('trackMenu.openInBrowser')}
      </DropdownMenuItem>
      {onOpenFileLocation && (
        <DropdownMenuItem onClick={onOpenFileLocation}>
          <FolderOpen className="h-4 w-4" />
          {t('trackMenu.openFileLocation')}
        </DropdownMenuItem>
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
          {onAddToQueue && (
            <DropdownMenuItem onClick={onAddToQueue}>
              <ListPlus className="h-4 w-4" />
              {t('trackMenu.addToQueue')}
            </DropdownMenuItem>
          )}
          <PlaylistPickerSubmenu trackId={trackId} variant="dropdown" onSuccess={onCloseMenu} />
          {canShare && (
            <DropdownMenuItem onClick={handleShareByDm}>
              <Send className="h-4 w-4" />
              {t('trackMenu.shareByDm')}
            </DropdownMenuItem>
          )}
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
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  onOpenFileLocation?: () => void;
  isSignedIn: boolean;
  trackId: number;
  onCloseMenu: () => void;
  onRemoveFromPlaylist?: () => void;
  onAddToQueue?: () => void;
  likeState?: LikeState;
  shareInfo?: ShareTrackInfo;
}

export function TrackRowActionsContextContent({
  onCopyLink,
  onOpenInBrowser,
  onOpenFileLocation,
  isSignedIn,
  trackId,
  onCloseMenu,
  onRemoveFromPlaylist,
  onAddToQueue,
  likeState,
  shareInfo,
}: TrackRowActionsContextContentProps) {
  return (
    <ContextMenuContent>
      <TrackMenuItems
        onCopyLink={onCopyLink}
        onOpenInBrowser={onOpenInBrowser}
        onOpenFileLocation={onOpenFileLocation}
        isSignedIn={isSignedIn}
        trackId={trackId}
        variant="context"
        onCloseMenu={onCloseMenu}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
        onAddToQueue={onAddToQueue}
        likeState={likeState}
        shareInfo={shareInfo}
      />
    </ContextMenuContent>
  );
}

interface TrackRowActionsDropdownProps {
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  onOpenFileLocation?: () => void;
  isSignedIn: boolean;
  trackId: number;
  dropdownMenuOpen: boolean;
  onDropdownMenuOpenChange: (open: boolean) => void;
  actionSlot?: React.ReactNode;
  onRemoveFromPlaylist?: () => void;
  onAddToQueue?: () => void;
  likeState?: LikeState;
  shareInfo?: ShareTrackInfo;
}

export function TrackRowActionsDropdown({
  onCopyLink,
  onOpenInBrowser,
  onOpenFileLocation,
  isSignedIn,
  trackId,
  dropdownMenuOpen,
  onDropdownMenuOpenChange,
  actionSlot,
  onRemoveFromPlaylist,
  onAddToQueue,
  likeState,
  shareInfo,
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
          <TrackMenuItems
            onCopyLink={onCopyLink}
            onOpenInBrowser={onOpenInBrowser}
            onOpenFileLocation={onOpenFileLocation}
            isSignedIn={isSignedIn}
            trackId={trackId}
            variant="dropdown"
            onCloseMenu={closeMenu}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            onAddToQueue={onAddToQueue}
            likeState={likeState}
            shareInfo={shareInfo}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
