import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface DownloadConflictDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DownloadConflictDialog({ open, onConfirm, onCancel }: DownloadConflictDialogProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
      title={t('library.detail.conflictTitle')}
      description={t('library.detail.conflictDescription')}
      confirmLabel={t('library.detail.conflictConfirm')}
      cancelLabel={t('library.detail.conflictCancel')}
      variant="default"
      onConfirm={onConfirm}
    />
  );
}
