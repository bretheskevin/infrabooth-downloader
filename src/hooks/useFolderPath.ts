import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSettingsStore } from '@/features/settings/store';
import { useFolderSelection } from './useFolderSelection';
import { getFolderName } from '@/lib/utils';

const NOOP_SELECTOR = () => undefined;

export function useFolderPath(enabled = true, playlistId?: string) {
  const { t } = useTranslation();
  const defaultPath = useSettingsStore(enabled ? (s) => s.downloadPath : NOOP_SELECTOR);
  const savedPlaylistPath = useSettingsStore(enabled && playlistId ? (s) => s.playlistDownloadPaths[playlistId] : NOOP_SELECTOR);
  const setPlaylistDownloadPath = useSettingsStore((s) => s.setPlaylistDownloadPath);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);

  const sessionPath = playlistId ? savedPlaylistPath : localPath;
  const effectivePath = sessionPath || defaultPath || undefined;

  const { selectFolder } = useFolderSelection({
    defaultPath: effectivePath,
    dialogTitle: t('common.changeFolder'),
    onSelected: (path) => {
      if (playlistId) setPlaylistDownloadPath(playlistId, path);
      else setLocalPath(path);
    },
    onPermissionDenied: () => toast.error(t('common.folderPermissionDenied')),
  });

  const folderName = useMemo(() => (effectivePath ? getFolderName(effectivePath) : undefined), [effectivePath]);
  const isCustomFolder = Boolean(sessionPath && sessionPath !== defaultPath);
  const resetLocalPath = useCallback(() => setLocalPath(undefined), []);

  return {
    effectivePath,
    folderName,
    isCustomFolder,
    selectFolder,
    resetLocalPath,
  };
}
