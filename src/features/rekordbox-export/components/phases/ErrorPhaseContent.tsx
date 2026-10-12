import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
  const title = isRunning ? t('rekordboxExport.runningTitle') : t('rekordboxExport.errorTitle');
  const message = isRunning ? t('rekordboxExport.runningMessage') : t(REKORDBOX_ERROR_KEYS[errorCode ?? ''] ?? 'common.error');

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant={isRunning ? 'ghost' : 'outline'} onClick={onClose} disabled={isQuitting}>
          {isRunning ? t('rekordboxExport.cancel') : t('rekordboxExport.close')}
        </Button>
        {isRunning && (
          <Button disabled={isQuitting} onClick={onQuitRekordbox}>
            {isQuitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('rekordboxExport.quitAndExport')}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
