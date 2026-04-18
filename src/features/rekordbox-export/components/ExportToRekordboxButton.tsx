import { useTranslation } from 'react-i18next';
import { Disc3 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { REKORDBOX_ERROR_KEYS } from '@/lib/rekordboxErrors';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useRekordboxExport } from '../hooks/useRekordboxExport';

interface ExportToRekordboxButtonProps {
  tracks: TrackInfo[] | undefined;
  playlistName: string;
  disabled?: boolean;
}

export function ExportToRekordboxButton({ tracks, playlistName, disabled }: ExportToRekordboxButtonProps) {
  const { t } = useTranslation();
  const { phase, progress, result, errorCode, openConfirm, startExport, close } = useRekordboxExport(tracks, playlistName);

  const trackCount = tracks?.length ?? 0;
  const isOpen = phase !== 'idle';
  const percent = progress ? (progress.currentTrack / progress.totalTracks) * 100 : 0;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openConfirm}
        disabled={disabled || trackCount === 0}
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Disc3 className="h-3 w-3" />
        <span>{t('rekordboxExport.button')}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
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
            <>
              <DialogHeader>
                <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
                <DialogDescription>
                  {progress
                    ? t('rekordboxExport.progress', { current: progress.currentTrack, total: progress.totalTracks })
                    : t('rekordboxExport.exporting')}
                </DialogDescription>
              </DialogHeader>
              {progress && (
                <div className="space-y-2">
                  <Progress value={percent} />
                  <p className="text-xs text-muted-foreground truncate">
                    {progress.trackTitle} — {progress.status === 'downloading'
                      ? t('rekordboxExport.downloading')
                      : t('rekordboxExport.exporting')}
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={close}>{t('rekordboxExport.cancel')}</Button>
              </DialogFooter>
            </>
          )}

          {phase === 'complete' && result && (
            <>
              <DialogHeader>
                <DialogTitle>{t('rekordboxExport.complete')}</DialogTitle>
                <DialogDescription>
                  {t('rekordboxExport.summary', {
                    exported: result.exportedCount,
                    skipped: result.skippedCount,
                    errors: result.errors.length,
                  })}
                </DialogDescription>
              </DialogHeader>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs text-destructive space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
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
