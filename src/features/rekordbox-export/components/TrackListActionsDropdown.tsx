import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Disc3, EllipsisVertical, ExternalLink, Link, Send } from 'lucide-react';
import type { TrackInfo, RekordboxExportStatus } from '@/bindings';
import { useLinkActions } from '@/hooks/useLinkActions';
import { REKORDBOX_ERROR_KEYS } from '@/lib/rekordboxErrors';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useRekordboxDetection } from '../hooks/useRekordboxDetection';
import { useRekordboxExport, type TrackStatus } from '../hooks/useRekordboxExport';
import { ExportPhaseSection } from './ExportPhaseSection';

interface TrackListActionsDropdownProps {
  tracks: TrackInfo[] | undefined;
  playlistName: string;
  permalinkUrl?: string;
  disabled?: boolean;
  shareInfo?: ShareTrackInfo;
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
            <span>{completedCount} / {totalTracks}</span>
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
        <Button variant="outline" onClick={onCancel}>{t('rekordboxExport.cancel')}</Button>
      </DialogFooter>
    </>
  );
}

export function TrackListActionsDropdown({ tracks, playlistName, permalinkUrl, disabled, shareInfo }: TrackListActionsDropdownProps) {
  const { t } = useTranslation();
  const { data: rekordboxStatus } = useRekordboxDetection();
  const { handleCopyLink, handleOpenInBrowser } = useLinkActions(permalinkUrl ?? '');

  const { phase, trackStatuses, totalTracks, result, errorCode, openConfirm, startExport, cancel, close } =
    useRekordboxExport(tracks, playlistName);

  const trackCount = tracks?.length ?? 0;
  const isOpen = phase !== 'idle';

  const groups = useMemo(() => groupByStatus(trackStatuses), [trackStatuses]);

  const showRekordbox = !rekordboxStatus || rekordboxStatus.found;
  const showLinks = !!permalinkUrl;
  const isSignedIn = useIsSignedIn();
  const canShare = isSignedIn && !!shareInfo;

  if (!showRekordbox && !showLinks && !canShare) return null;

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
          {showLinks && showRekordbox && <DropdownMenuSeparator />}
          {showRekordbox && (
            <DropdownMenuItem onClick={openConfirm}>
              <Disc3 className="h-3.5 w-3.5" />
              {t('rekordboxExport.button')}
            </DropdownMenuItem>
          )}
          {canShare && (showLinks || showRekordbox) && <DropdownMenuSeparator />}
          {canShare && shareInfo && (
            <DropdownMenuItem onClick={() => useMessagesStore.getState().openShareDialog(shareInfo)}>
              <Send className="h-3.5 w-3.5" />
              {t('trackMenu.shareByDm')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { if (phase === 'exporting') cancel(); else close(); } }}>
        <DialogContent className="sm:max-w-md">
          {phase === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
                <DialogDescription>
                  {t('rekordboxExport.confirmMessage', { count: trackCount, playlist: playlistName })}
                </DialogDescription>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">{t('rekordboxExport.confirmNote')}</p>
              <DialogFooter>
                <Button variant="outline" onClick={close}>{t('rekordboxExport.cancel')}</Button>
                <Button onClick={startExport}>{t('rekordboxExport.start')}</Button>
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

          {phase === 'complete' && result && (
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
                <Button onClick={close}>{t('rekordboxExport.close')}</Button>
              </DialogFooter>
            </>
          )}

          {phase === 'error' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
                <DialogDescription className="text-destructive">
                  {t(REKORDBOX_ERROR_KEYS[errorCode ?? ''] ?? 'common.error')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={close}>{t('rekordboxExport.close')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
