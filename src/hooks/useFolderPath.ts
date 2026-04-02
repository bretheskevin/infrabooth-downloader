import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSettingsStore } from '@/features/settings/store';
import { useFolderSelection } from './useFolderSelection';
import { getFolderName } from '@/lib/utils';

const NOOP_SELECTOR = () => undefined;

export function useFolderPath(enabled = true) {
  const { t } = useTranslation();
  const defaultPath = useSettingsStore(enabled ? (s) => s.downloadPath : NOOP_SELECTOR);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);
  const effectivePath = localPath || defaultPath || undefined;

  const { selectFolder } = useFolderSelection({
    defaultPath: effectivePath,
    dialogTitle: t('common.changeFolder'),
    onSelected: setLocalPath,
    onPermissionDenied: () => toast.error(t('common.folderPermissionDenied')),
  });

  const folderName = useMemo(() => (effectivePath ? getFolderName(effectivePath) : undefined), [effectivePath]);
  const isCustomFolder = Boolean(localPath && localPath !== defaultPath);
  const resetLocalPath = useCallback(() => setLocalPath(undefined), []);

  return {
    effectivePath,
    folderName,
    isCustomFolder,
    selectFolder,
    resetLocalPath,
  };
}
