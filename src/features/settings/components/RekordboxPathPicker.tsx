import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { selectFolder } from '@/features/settings/api/folderDialog';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/features/settings/store';

interface RekordboxPathPickerProps {
  onPicked: (path: string) => void;
}

export function RekordboxPathPicker({ onPicked }: RekordboxPathPickerProps) {
  const { t } = useTranslation();
  const rekordboxPathOverride = useSettingsStore((s) => s.rekordboxPathOverride);

  async function handleBrowse() {
    try {
      const defaultPath = rekordboxPathOverride || await api.getDefaultRekordboxDataDirectoryParent();

      const selected = await selectFolder({
        defaultPath,
        title: t('settings.rekordboxSelectDirectory'),
      });

      if (!selected) return;

      useSettingsStore.getState().setRekordboxPathOverride(selected);
      onPicked(selected);
    } catch (e) {
      void logger.error(`Failed to browse for Rekordbox directory: ${e}`);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 truncate text-sm text-muted-foreground">
              {rekordboxPathOverride || t('settings.notSet')}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm break-all">
            {rekordboxPathOverride || t('settings.notSet')}
          </TooltipContent>
        </Tooltip>
        <Button
          variant="outline"
          onClick={() => void handleBrowse()}
          aria-label={t('settings.rekordboxSelectDirectory')}
        >
          {t('settings.browse')}
        </Button>
      </div>
    </div>
  );
}
