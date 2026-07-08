import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AlertTriangle, Disc3, EllipsisVertical, ExternalLink, Heart, Link, Loader2, Pencil, Send, Trash2 } from 'lucide-react';
import type { ExportResult, TrackInfo, RekordboxExportStatus } from '@/bindings';
import { cn } from '@/lib/utils';
import { useLinkActions } from '@/hooks/useLinkActions';
import type { LikeState } from '@/hooks/useLikeTrack';
import { REKORDBOX_ERROR_KEYS } from '@/lib/rekordboxErrors';
import { useIsSignedIn } from '@/features/auth/store';
import { useSettingsStore } from '@/features/settings/store';
import { useMessagesStore, type ShareTrackInfo } from '@/features/messages/store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeletePlaylist } from '@/hooks/useDeletePlaylist';
import { Progress } from '@/components/ui/progress';
import { useRekordboxDetection } from '@/features/rekordbox-export/hooks/useRekordboxDetection';
import { useRekordboxExport, type TrackStatus } from '@/features/rekordbox-export/hooks/useRekordboxExport';
import { useRekordboxTree } from '@/features/rekordbox-export/hooks/useRekordboxTree';
import { findInfraboothFolderId, findPlaylistParentId, folderExistsInTree } from '@/features/rekordbox-export/utils/buildTree';
import { ExportPhaseSection } from '@/features/rekordbox-export/components/ExportPhaseSection';
import { RekordboxTreePicker } from '@/features/rekordbox-export/components/RekordboxTreePicker';
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

const MAX_VISIBLE_TRACKS = 3;

function groupByStatus(trackStatuses: Map<string, TrackStatus>) {
  const groups: Record<RekordboxExportStatus, TrackStatus[]> = {
    pending: [],
    downloading: [],
    downloaded: [],
    exporting: [],
    completed: [],
    error: [],
  };
  for (const status of trackStatuses.values()) {
    groups[status.status].push(status);
  }
  return groups;
}

interface ExportingContentProps {
  groups: Record<RekordboxExportStatus, TrackStatus[]>;
  totalTracks: number;
  completedCount: number;
  percent: number;
  isRegistering: boolean;
  onCancel: () => void;
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

function ExportingContent({ groups, totalTracks, completedCount, percent, isRegistering, onCancel }: ExportingContentProps) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
        <DialogDescription>
          {isRegistering ? t('rekordboxExport.registeringTracks') : t('rekordboxExport.downloadingTracks')}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 overflow-hidden">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              {completedCount} / {totalTracks}
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <Progress
            value={percent}
            className={!isRegistering ? '[&>div]:bg-[hsl(var(--info))] [&>div]:shadow-[0_0_8px_hsl(var(--info)/0.5)]' : ''}
          />
        </div>
        <div className="max-h-48 overflow-y-auto overflow-x-hidden">
          {!isRegistering ? (
            <>
              <ExportPhaseSection
                label={t('rekordboxExport.sectionDownloading')}
                icon="↓"
                colorClass="text-[hsl(var(--info))]"
                tracks={groups.downloading}
                showSpinner
              />
              <ExportPhaseSection
                label={t('rekordboxExport.sectionDownloaded')}
                icon="✓"
                colorClass="text-[hsl(var(--success))]"
                tracks={groups.downloaded}
                maxVisible={MAX_VISIBLE_TRACKS}
              />
            </>
          ) : (
            <>
              <ExportPhaseSection
                label={t('rekordboxExport.sectionRegistering')}
                icon="⚡"
                colorClass="text-primary"
                tracks={groups.exporting}
                showSpinner
              />
              <ExportPhaseSection
                label={t('rekordboxExport.sectionCompleted')}
                icon="✓"
                colorClass="text-[hsl(var(--success))]"
                tracks={groups.completed}
                maxVisible={MAX_VISIBLE_TRACKS}
              />
            </>
          )}
          {groups.error.length > 0 && (
            <ExportPhaseSection
              label={t('rekordboxExport.sectionErrors')}
              icon="✗"
              colorClass="text-destructive"
              tracks={groups.error}
              showError
            />
          )}
          {groups.pending.length > 0 && (
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1 text-muted-foreground mt-2">
              ○ {t('rekordboxExport.sectionPending')} ({groups.pending.length})
              <p className="normal-case tracking-normal font-normal text-[11px] mt-1">
                {t('rekordboxExport.pendingCount', { count: groups.pending.length })}
              </p>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t('rekordboxExport.cancel')}
        </Button>
      </DialogFooter>
    </>
  );
}

function CompletePhaseContent({
  result,
  groups,
  onClose,
}: {
  result: ExportResult;
  groups: Record<RekordboxExportStatus, TrackStatus[]>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('rekordboxExport.complete')}</DialogTitle>
        <DialogDescription>
          {t('rekordboxExport.summaryLine', {
            exported: result.exportedCount,
            skipped: result.skippedCount,
            errors: result.errors.length,
          })}
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-48 overflow-y-auto overflow-x-hidden">
        {groups.error.length > 0 && (
          <ExportPhaseSection
            label={t('rekordboxExport.sectionErrors')}
            icon="✗"
            colorClass="text-destructive"
            tracks={groups.error}
            showError
          />
        )}
        <ExportPhaseSection
          label={t('rekordboxExport.sectionCompleted')}
          icon="✓"
          colorClass="text-[hsl(var(--success))]"
          tracks={groups.completed}
          maxVisible={MAX_VISIBLE_TRACKS}
        />
      </div>
      <DialogFooter>
        <Button onClick={onClose}>{t('rekordboxExport.close')}</Button>
      </DialogFooter>
    </>
  );
}

function ErrorPhaseContent({
  errorCode,
  onClose,
  onQuitRekordbox,
  isQuitting,
}: {
  errorCode: string | null;
  onClose: () => void;
  onQuitRekordbox: () => void;
  isQuitting: boolean;
}) {
  const { t } = useTranslation();
  const isRunning = errorCode === 'REKORDBOX_RUNNING';
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('rekordboxExport.errorTitle')}</DialogTitle>
        <DialogDescription asChild>
          <span className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t(REKORDBOX_ERROR_KEYS[errorCode ?? ''] ?? 'common.error')}
          </span>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isQuitting}>
          {t('rekordboxExport.close')}
        </Button>
        {isRunning && (
          <Button disabled={isQuitting} onClick={onQuitRekordbox}>
            {isQuitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.backupCloseRekordbox')}
          </Button>
        )}
      </DialogFooter>
    </>
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { deletePlaylist, isDeleting } = useDeletePlaylist(() => {
    setDeleteConfirmOpen(false);
    deleteAction?.onDeleteSuccess?.();
  });
  const { handleCopyLink, handleOpenInBrowser } = useLinkActions(permalinkUrl ?? '');

  const {
    phase,
    trackStatuses,
    totalTracks,
    result,
    errorCode,
    selectedFolderId,
    setSelectedFolderId,
    openConfirm,
    startExport,
    cancel,
    close,
    quitAndRetry,
    isQuitting,
  } = useRekordboxExport(tracks, playlistName);

  const { data: treeData, isLoading: treeLoading, isError: treeError, retry: retryTree } = useRekordboxTree(phase === 'confirm');
  const storedDefaultFolderId = useSettingsStore((s) => s.rekordboxDefaultExportFolderId);

  const defaultFolderId = useMemo(() => {
    if (!treeData) return null;
    const playlistParent = findPlaylistParentId(treeData, playlistName);
    if (playlistParent !== null) return playlistParent;
    if (storedDefaultFolderId === 'root') return null;
    if (storedDefaultFolderId && folderExistsInTree(treeData, storedDefaultFolderId)) return storedDefaultFolderId;
    return findInfraboothFolderId(treeData);
  }, [treeData, playlistName, storedDefaultFolderId]);

  const effectiveFolderId = selectedFolderId === undefined ? defaultFolderId : selectedFolderId;

  const handleStartExport = () => {
    startExport(effectiveFolderId);
  };

  const trackCount = tracks?.length ?? 0;
  const isOpen = phase !== 'idle';

  const groups = useMemo(() => groupByStatus(trackStatuses), [trackStatuses]);

  const showRekordbox = !rekordboxStatus || rekordboxStatus.found;
  const showLinks = !!permalinkUrl;
  const isSignedIn = useIsSignedIn();
  const canShare = isSignedIn && !!shareInfo;

  if (!showRekordbox && !showLinks && !canShare && !likeState && !deleteAction && !editAction) return null;

  const isRegistering = groups.exporting.length > 0 || groups.completed.length > 0;
  const completedCount = groups.downloaded.length + groups.exporting.length + groups.completed.length + groups.error.length;
  const percent = totalTracks > 0 ? (completedCount / totalTracks) * 100 : 0;

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
            <DropdownMenuItem onClick={openConfirm}>
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

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (isQuitting) return;
            if (phase === 'exporting') cancel();
            else close();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {phase === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
                <DialogDescription>{t('rekordboxExport.confirmMessage', { count: trackCount, playlist: playlistName })}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('rekordboxExport.destinationLabel')}</Label>
                {treeLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('rekordboxExport.loadingTree')}
                  </div>
                ) : treeError ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-destructive">{t('rekordboxExport.treeError')}</p>
                    <Button variant="outline" size="sm" onClick={() => retryTree()}>
                      {t('rekordboxExport.treeRetry')}
                    </Button>
                  </div>
                ) : (
                  <RekordboxTreePicker
                    nodes={treeData ?? []}
                    selectedFolderId={effectiveFolderId}
                    onSelectFolder={setSelectedFolderId}
                    newPlaylistName={playlistName}
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close}>
                  {t('rekordboxExport.cancel')}
                </Button>
                <Button onClick={handleStartExport} disabled={treeLoading || treeError}>
                  {t('rekordboxExport.start')}
                </Button>
              </DialogFooter>
            </>
          )}

          {phase === 'exporting' && (
            <ExportingContent
              groups={groups}
              totalTracks={totalTracks}
              completedCount={completedCount}
              percent={percent}
              isRegistering={isRegistering}
              onCancel={cancel}
            />
          )}

          {phase === 'complete' && result && <CompletePhaseContent result={result} groups={groups} onClose={close} />}

          {phase === 'error' && (
            <ErrorPhaseContent errorCode={errorCode} onClose={close} onQuitRekordbox={quitAndRetry} isQuitting={isQuitting} />
          )}
        </DialogContent>
      </Dialog>

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
