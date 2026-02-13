import { useTranslation } from 'react-i18next';

interface SuccessMessageProps {
  completedCount: number;
  totalCount: number;
  cancelledCount: number;
  isFullSuccess: boolean;
  isCancelled: boolean;
}

export function SuccessMessage({
  completedCount,
  totalCount,
  cancelledCount,
  isFullSuccess,
  isCancelled,
}: SuccessMessageProps) {
  const { t } = useTranslation();

  const getTitle = () => {
    if (isCancelled) return t('completion.titleCancelled');
    if (isFullSuccess) return t('completion.title');
    return t('completion.titlePartial');
  };

  const getMessage = () => {
    if (isCancelled) {
      if (completedCount === 0) {
        return t('completion.allCancelled');
      }
      return t('completion.tracksCancelled', { completed: completedCount, cancelled: cancelledCount });
    }
    if (isFullSuccess) {
      return t('completion.allTracksDownloaded', { total: totalCount });
    }
    return t('completion.tracksDownloaded', {
      completed: completedCount,
      total: totalCount,
    });
  };

  return (
    <div className="space-y-1 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        {getTitle()}
      </h2>
      <p className="text-sm text-muted-foreground">
        {getMessage()}
      </p>
    </div>
  );
}
