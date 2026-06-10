import { Trans, useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface RemoveFromPlaylistDialogProps {
  open: boolean;
  trackTitle: string;
  playlistTitle: string;
  isRemoving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveFromPlaylistDialog({
  open,
  trackTitle,
  playlistTitle,
  isRemoving,
  onConfirm,
  onCancel,
}: RemoveFromPlaylistDialogProps) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isRemoving) onCancel();
      }}
      title={t('trackMenu.removeFromPlaylistTitle')}
      description={
        <Trans
          i18nKey="trackMenu.removeFromPlaylistDescription"
          values={{ track: trackTitle, playlist: playlistTitle }}
          components={{ strong: <strong className="font-semibold text-foreground" /> }}
        />
      }
      confirmLabel={isRemoving ? t('trackMenu.removing') : t('trackMenu.removeFromPlaylistConfirm')}
      cancelLabel={t('trackMenu.removeFromPlaylistCancel')}
      isLoading={isRemoving}
      onConfirm={onConfirm}
    />
  );
}
