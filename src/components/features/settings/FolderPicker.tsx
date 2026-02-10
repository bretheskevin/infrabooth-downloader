import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export function FolderPicker() {
  const { t } = useTranslation();
  const downloadPath = useSettingsStore((state) => state.downloadPath);
  const setDownloadPath = useSettingsStore((state) => state.setDownloadPath);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        defaultPath: downloadPath || undefined,
        title: t('settings.selectFolder'),
      });

      if (selected && typeof selected === 'string') {
        const hasPermission = await invoke<boolean>('check_write_permission', {
          path: selected,
        });

        if (hasPermission) {
          setDownloadPath(selected);
          setError(null);
        } else {
          setError(t('settings.permissionDenied'));
        }
      }
      // If selected is null, user cancelled - do nothing
    } catch (err) {
      console.error('Folder selection error:', err);
      setError(t('settings.permissionDenied'));
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('settings.downloadLocation')}</label>
      <div className="flex items-center gap-2">
        <span
          className="flex-1 truncate text-sm text-muted-foreground"
          aria-label={t('settings.currentPath', { path: downloadPath })}
        >
          {downloadPath || t('settings.notSet')}
        </span>
        <Button
          variant="outline"
          onClick={handleBrowse}
          aria-label={t('settings.selectFolder')}
        >
          {t('settings.browse')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
