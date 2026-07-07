import { useCallback } from 'react';
import { openDownloadFolder } from '@/lib/shellCommands';
import { getDefaultDownloadPath } from '@/features/settings/api/settings';
import { logger } from '@/lib/logger';

export function useOpenDownloadFolder(outputDir: string | null, onError?: () => void) {
  return useCallback(async () => {
    let pathToOpen = outputDir;

    if (!pathToOpen) {
      try {
        pathToOpen = await getDefaultDownloadPath();
      } catch (error) {
        void logger.error(`[useOpenDownloadFolder] Failed to get default path: ${error}`);
        return;
      }
    }

    if (pathToOpen) {
      try {
        await openDownloadFolder(pathToOpen);
      } catch (error) {
        void logger.error(`[useOpenDownloadFolder] Failed to open folder: ${error}`);
        onError?.();
      }
    }
  }, [outputDir, onError]);
}
