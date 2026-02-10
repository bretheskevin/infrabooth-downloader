import { useTranslation } from 'react-i18next';

interface SuccessMessageProps {
  completedCount: number;
  totalCount: number;
  isFullSuccess: boolean;
}

export function SuccessMessage({
  completedCount,
  totalCount,
  isFullSuccess,
}: SuccessMessageProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1 text-center">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {isFullSuccess
          ? t('completion.title')
          : t('completion.titlePartial')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {isFullSuccess
          ? t('completion.allTracksDownloaded', { total: totalCount })
          : t('completion.tracksDownloaded', {
              completed: completedCount,
              total: totalCount,
            })}
      </p>
    </div>
  );
}
