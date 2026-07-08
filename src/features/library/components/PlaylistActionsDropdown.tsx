import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Disc3, EllipsisVertical, ExternalLink, Heart, Link, Pencil, Send, Trash2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { cn } from '@/lib/utils';
import { useLinkActions } from '@/hooks/useLinkActions';
import type { LikeState } from '@/hooks/useLikeTrack';
import { useIsSignedIn } from '@/features/auth/store';
import { useMessagesStore, type ShareTrackInfo } from '@/features/messages/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeletePlaylist } from '@/hooks/useDeletePlaylist';
import { useRekordboxDetection } from '@/features/rekordbox-export/hooks/useRekordboxDetection';
import { useRekordboxExport } from '@/features/rekordbox-export/hooks/useRekordboxExport';
import { RekordboxExportDialog } from '@/features/rekordbox-export/components/RekordboxExportDialog';
import { EditPlaylistDialog } from '@/components/playlist-detail/EditPlaylistDialog';
import type { EditAction } from '@/components/track-list/types';

interface DeleteAction {
  playlistId: number;
  onDeleteSuccess?: () => void;
}

interface PlaylistActionsDropdownProps {
  tracks: TrackInfo[] | undefined;
  playlistName: string;
  permalinkUrl?: string;
  disabled?: boolean;
  shareInfo?: ShareTrackInfo;
  likeState?: LikeState;
  deleteAction?: DeleteAction;
  editAction?: EditAction;
}

interface DeletePlaylistDialogProps {
  open: boolean;
  playlistName: string;
  playlistId: number;
  isDeleting: boolean;
  onDelete: (id: number) => void;
  onClose: () => void;
}

function DeletePlaylistDialog({ open, playlistName, playlistId, isDeleting, onDelete, onClose }: DeletePlaylistDialogProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={t('playlistMenu.deleteTitle')}
      description={
        <Trans
          i18nKey="playlistMenu.deleteDescription"
          values={{ playlist: playlistName }}
          components={{ strong: <strong className="font-semibold text-foreground" /> }}
        />
      }
      confirmLabel={t('playlistMenu.deleteConfirm')}
      cancelLabel={t('playlistMenu.deleteCancel')}
      isLoading={isDeleting}
      onConfirm={() => onDelete(playlistId)}
    />
  );
}

export function PlaylistActionsDropdown({
  tracks,
  playlistName,
  permalinkUrl,
  disabled,
  shareInfo,
  likeState,
  deleteAction,
  editAction,
}: PlaylistActionsDropdownProps) {
  const { t } = useTranslation();
  const { data: rekordboxStatus } = useRekordboxDetection();
  const isSignedIn = useIsSignedIn();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { deletePlaylist, isDeleting } = useDeletePlaylist(() => {
    setDeleteConfirmOpen(false);
    deleteAction?.onDeleteSuccess?.();
  });
  const { handleCopyLink, handleOpenInBrowser } = useLinkActions(permalinkUrl ?? '');
  const rekordbox = useRekordboxExport(tracks, playlistName);

  const trackCount = tracks?.length ?? 0;
  const showRekordbox = !rekordboxStatus || rekordboxStatus.found;
  const showLinks = !!permalinkUrl;
  const canShare = isSignedIn && !!shareInfo;

  if (!showRekordbox && !showLinks && !canShare && !likeState && !deleteAction && !editAction) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('trackMenu.moreActions')}
            disabled={disabled || trackCount === 0}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {likeState && (
            <DropdownMenuItem onClick={likeState.onToggle} disabled={likeState.isLoading}>
              <Heart className={cn('h-3.5 w-3.5', likeState.isLiked && 'fill-primary text-primary')} />
              {t(likeState.isLiked ? 'playlistMenu.unlike' : 'playlistMenu.like')}
            </DropdownMenuItem>
          )}
          {likeState && (showLinks || canShare || showRekordbox || editAction || deleteAction) && <DropdownMenuSeparator />}
          {showLinks && (
            <>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link className="h-3.5 w-3.5" />
                {t('trackMenu.copyLink')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenInBrowser}>
                <ExternalLink className="h-3.5 w-3.5" />
                {t('trackMenu.openInBrowser')}
              </DropdownMenuItem>
            </>
          )}
          {canShare && shareInfo && (
            <DropdownMenuItem onClick={() => useMessagesStore.getState().openShareDialog(shareInfo)}>
              <Send className="h-3.5 w-3.5" />
              {t('trackMenu.shareByDm')}
            </DropdownMenuItem>
          )}
          {showRekordbox && (showLinks || canShare) && <DropdownMenuSeparator />}
          {showRekordbox && (
            <DropdownMenuItem onClick={rekordbox.openConfirm}>
              <Disc3 className="h-3.5 w-3.5" />
              {t('rekordboxExport.button')}
            </DropdownMenuItem>
          )}
          {(editAction || deleteAction) && (showLinks || canShare || showRekordbox) && <DropdownMenuSeparator />}
          {editAction && (
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              {t('playlistMenu.edit')}
            </DropdownMenuItem>
          )}
          {deleteAction && (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              {t('playlistMenu.delete')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showRekordbox && <RekordboxExportDialog controller={rekordbox} playlistName={playlistName} trackCount={trackCount} />}

      {deleteAction && (
        <DeletePlaylistDialog
          open={deleteConfirmOpen}
          playlistName={playlistName}
          playlistId={deleteAction.playlistId}
          isDeleting={isDeleting}
          onDelete={deletePlaylist}
          onClose={() => setDeleteConfirmOpen(false)}
        />
      )}

      {editAction && (
        <EditPlaylistDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          playlistId={editAction.playlistId}
          initialTitle={playlistName}
          initialIsPublic={editAction.isPublic}
          isPublicKnown={editAction.isPublicKnown}
          tracksReady={editAction.tracksReady}
          tracks={tracks ?? []}
          onSaved={editAction.onEdited}
        />
      )}
    </>
  );
}
