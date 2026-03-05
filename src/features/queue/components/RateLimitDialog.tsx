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

interface RateLimitDialogProps {
  open: boolean;
  onRetry: () => void;
  onStop: () => void;
}

export function RateLimitDialog({
  open,
  onRetry,
  onStop,
}: RateLimitDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('download.rateLimitDialogTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {t('download.rateLimitDialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStop}>
            {t('download.rateLimitDialogStop')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRetry}>
            {t('download.rateLimitDialogRetry')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
