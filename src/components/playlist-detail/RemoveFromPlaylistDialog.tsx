import { Trans, useTranslation } from 'react-i18next';
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
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isRemoving) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('trackMenu.removeFromPlaylistTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey="trackMenu.removeFromPlaylistDescription"
              values={{ track: trackTitle, playlist: playlistTitle }}
              components={{ strong: <strong className="font-semibold text-foreground" /> }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isRemoving}>
            {t('trackMenu.removeFromPlaylistCancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? t('trackMenu.removing') : t('trackMenu.removeFromPlaylistConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
