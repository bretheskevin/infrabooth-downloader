import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FailedTracksLinkProps {
  failedCount: number;
  onClick: () => void;
}

export function FailedTracksLink({ failedCount, onClick }: FailedTracksLinkProps) {
  const { t } = useTranslation();

  if (failedCount === 0) return null;

  const message =
    failedCount === 1
      ? t('completion.failedTracksSingular')
      : t('completion.failedTracks', { count: failedCount });

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
      aria-label={`${message}. ${t('completion.viewFailed')}`}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>{message}</span>
    </button>
  );
}
