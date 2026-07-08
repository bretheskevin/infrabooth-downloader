import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { REKORDBOX_ERROR_KEYS } from '@/lib/rekordboxErrors';
import { Button } from '@/components/ui/button';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ErrorPhaseContentProps {
  errorCode: string | null;
  onClose: () => void;
  onQuitRekordbox: () => void;
  isQuitting: boolean;
}

export function ErrorPhaseContent({ errorCode, onClose, onQuitRekordbox, isQuitting }: ErrorPhaseContentProps) {
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
