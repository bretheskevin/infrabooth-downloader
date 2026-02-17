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

interface AuthChoiceDialogProps {
  open: boolean;
  onReAuthenticate: () => void;
  onContinueStandard: () => void;
}

export function AuthChoiceDialog({
  open,
  onReAuthenticate,
  onContinueStandard,
}: AuthChoiceDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('auth.sessionExpired')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('auth.sessionExpiredDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueStandard}>
            {t('auth.continueStandard')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onReAuthenticate}>
            {t('auth.signInAgain')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
