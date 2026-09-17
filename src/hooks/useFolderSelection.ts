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
    void logger.info(
      `[useFolderSelection] Opening folder dialog — defaultPath: "${defaultPath ?? 'none'}", title: "${dialogTitle ?? 'none'}"`,
    );
    let selected: string | string[] | null = null;
    try {
      selected = await open({
        directory: true,
        defaultPath: defaultPath || undefined,
        title: dialogTitle,
      });

      if (!selected || typeof selected !== 'string') {
        void logger.info(`[useFolderSelection] Dialog cancelled or no selection (raw value: ${JSON.stringify(selected)})`);
        return null;
      }

      void logger.info(`[useFolderSelection] Path selected: "${selected}"`);
      void logger.info(`[useFolderSelection] Checking write permission for: "${selected}"`);
      const hasPermission = await checkWritePermission(selected);
      void logger.info(`[useFolderSelection] checkWritePermission returned: ${hasPermission}`);

      if (hasPermission) {
        setError(null);
        onSelectedRef.current?.(selected);
        return selected;
      } else {
        void logger.warn(`[useFolderSelection] Path rejected as not writable: "${selected}"`);
        setError('permission_denied');
        onPermissionDeniedRef.current?.();
        return null;
      }
    } catch (err) {
      const errStr = err instanceof Error ? err.message : String(err);
      void logger.error(
        `[useFolderSelection] Folder selection error (selected: "${typeof selected === 'string' ? selected : 'none'}"): ${errStr}`,
      );
      setError('permission_denied');
      return null;
    }
  }, [defaultPath, dialogTitle]);

  return { selectFolder, error };
}
