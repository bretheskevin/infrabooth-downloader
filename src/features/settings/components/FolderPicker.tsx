import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/features/settings/store';
import { useTranslation } from 'react-i18next';
import { useFolderSelection } from '@/hooks';

export function FolderPicker() {
  const { t } = useTranslation();
  const downloadPath = useSettingsStore((state) => state.downloadPath);
  const setDownloadPath = useSettingsStore((state) => state.setDownloadPath);

  const { selectFolder, error } = useFolderSelection({
    defaultPath: downloadPath || undefined,
    dialogTitle: t('settings.selectFolder'),
    onSelected: setDownloadPath,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 truncate text-sm text-muted-foreground" aria-label={t('settings.currentPath', { path: downloadPath })}>
              {downloadPath || t('settings.notSet')}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm break-all">{downloadPath || t('settings.notSet')}</TooltipContent>
        </Tooltip>
        <Button variant="outline" onClick={selectFolder} aria-label={t('settings.selectFolder')}>
          {t('settings.browse')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {error === 'permission_denied' && t('settings.permissionDenied')}
        </p>
      )}
    </div>
  );
}
