import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DownloadConflictDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DownloadConflictDialog({
  open,
  onConfirm,
  onCancel,
}: DownloadConflictDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('library.detail.conflictTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('library.detail.conflictDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t('library.detail.conflictCancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('library.detail.conflictConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
