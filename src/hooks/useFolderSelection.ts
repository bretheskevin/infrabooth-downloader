import { useState, useCallback, useRef, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { checkWritePermission } from '@/features/settings/api/settings';
import { logger } from '@/lib/logger';

type FolderSelectionError = 'permission_denied' | null;

interface UseFolderSelectionOptions {
  defaultPath?: string;
  dialogTitle?: string;
  onSelected?: (path: string) => void;
  onPermissionDenied?: () => void;
}

interface UseFolderSelectionReturn {
  selectFolder: () => Promise<string | null>;
  error: FolderSelectionError;
}

export function useFolderSelection({
  defaultPath,
  dialogTitle,
  onSelected,
  onPermissionDenied,
}: UseFolderSelectionOptions = {}): UseFolderSelectionReturn {
  const [error, setError] = useState<FolderSelectionError>(null);

  const onSelectedRef = useRef(onSelected);
  const onPermissionDeniedRef = useRef(onPermissionDenied);

  useEffect(() => {
    onSelectedRef.current = onSelected;
  }, [onSelected]);

  useEffect(() => {
    onPermissionDeniedRef.current = onPermissionDenied;
  }, [onPermissionDenied]);

  const selectFolder = useCallback(async (): Promise<string | null> => {
    try {
      const selected = await open({
        directory: true,
        defaultPath: defaultPath || undefined,
        title: dialogTitle,
      });

      if (!selected || typeof selected !== 'string') {
        return null;
      }

      const hasPermission = await checkWritePermission(selected);

      if (hasPermission) {
        setError(null);
        onSelectedRef.current?.(selected);
        return selected;
      } else {
        setError('permission_denied');
        onPermissionDeniedRef.current?.();
        return null;
      }
    } catch (err) {
      logger.error(`[useFolderSelection] Folder selection error: ${err}`);
      setError('permission_denied');
      return null;
    }
  }, [defaultPath, dialogTitle]);

  return { selectFolder, error };
}
