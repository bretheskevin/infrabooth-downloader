import { Link, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
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
import { PlaylistPickerSubmenu } from '@/components/PlaylistPickerSubmenu';

interface TrackMenuItemsProps {
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  isSignedIn: boolean;
  trackId: number;
  variant: 'context' | 'dropdown';
  onCloseMenu?: () => void;
  onRemoveFromPlaylist?: () => void;
}

function TrackMenuItems({ onCopyLink, onOpenInBrowser, isSignedIn, trackId, variant, onCloseMenu, onRemoveFromPlaylist }: TrackMenuItemsProps) {
  const { t } = useTranslation();

  if (variant === 'context') {
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
        {isSignedIn && (
          <>
            <ContextMenuSeparator />
            <PlaylistPickerSubmenu trackId={trackId} variant="context" onSuccess={onCloseMenu} />
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
      {isSignedIn && (
        <>
          <DropdownMenuSeparator />
          <PlaylistPickerSubmenu trackId={trackId} variant="dropdown" onSuccess={onCloseMenu} />
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
  isSignedIn: boolean;
  trackId: number;
  onCloseMenu: () => void;
  onRemoveFromPlaylist?: () => void;
}

export function TrackRowActionsContextContent({
  onCopyLink,
  onOpenInBrowser,
  isSignedIn,
  trackId,
  onCloseMenu,
  onRemoveFromPlaylist,
}: TrackRowActionsContextContentProps) {
  return (
    <ContextMenuContent>
      <TrackMenuItems
        onCopyLink={onCopyLink}
        onOpenInBrowser={onOpenInBrowser}
        isSignedIn={isSignedIn}
        trackId={trackId}
        variant="context"
        onCloseMenu={onCloseMenu}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
      />
    </ContextMenuContent>
  );
}

interface TrackRowActionsDropdownProps {
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  isSignedIn: boolean;
  trackId: number;
  dropdownMenuOpen: boolean;
  onDropdownMenuOpenChange: (open: boolean) => void;
  actionSlot?: React.ReactNode;
  onRemoveFromPlaylist?: () => void;
}

export function TrackRowActionsDropdown({
  onCopyLink,
  onOpenInBrowser,
  isSignedIn,
  trackId,
  dropdownMenuOpen,
  onDropdownMenuOpenChange,
  actionSlot,
  onRemoveFromPlaylist,
}: TrackRowActionsDropdownProps) {
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
            isSignedIn={isSignedIn}
            trackId={trackId}
            variant="dropdown"
            onCloseMenu={() => onDropdownMenuOpenChange(false)}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
