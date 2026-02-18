import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettingsStore } from '@/features/settings/store';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface DownloadBarProps {
  onDownload: (outputDir?: string) => void;
  isDownloading?: boolean;
}

function getFolderName(path: string): string {
  const segments = path.split(/[/\\]/);
  return segments[segments.length - 1] || path;
}

export function DownloadBar({ onDownload, isDownloading = false }: DownloadBarProps) {
  const { t } = useTranslation();
  const defaultPath = useSettingsStore((state) => state.downloadPath);

  // Local state for per-download override (starts with default from settings)
  const [localPath, setLocalPath] = useState<string | undefined>(defaultPath || undefined);
  const [error, setError] = useState<string | null>(null);

  // Initialize localPath when defaultPath becomes available (e.g., after hydration)
  useEffect(() => {
    if (defaultPath && !localPath) {
      setLocalPath(defaultPath);
    }
  }, [defaultPath, localPath]);

  const handleChangeFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        defaultPath: localPath || defaultPath || undefined,
        title: t('settings.selectFolder'),
      });

      if (selected && typeof selected === 'string') {
        const hasPermission = await invoke<boolean>('check_write_permission', {
          path: selected,
        });

        if (hasPermission) {
          setLocalPath(selected);
          setError(null);
        } else {
          setError(t('settings.permissionDenied'));
        }
      }
    } catch (err) {
      logger.error(`[DownloadBar] Folder selection error: ${err}`);
      setError(t('settings.permissionDenied'));
    }
  };

  const handleDownloadClick = () => {
    onDownload(localPath || undefined);
  };

  const currentPath = localPath || defaultPath;
  const folderName = currentPath ? getFolderName(currentPath) : t('settings.notSet');
  const isOverridden = localPath && localPath !== defaultPath;

  return (
    <div className="space-y-2" data-testid="download-bar">
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl',
          'bg-secondary/50 border border-border/30',
          'transition-all duration-200'
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleChangeFolder}
                disabled={isDownloading}
                className={cn(
                  'flex items-center gap-2.5 flex-1 min-w-0 text-left px-2 py-1.5 -ml-2 rounded-lg',
                  'hover:bg-secondary transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                aria-label={t('settings.selectFolder')}
                data-testid="folder-selector"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Folder className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium">{folderName}</span>
                  {isOverridden && (
                    <span className="block text-xs text-muted-foreground">
                      {t('downloadBar.customLocation')}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs break-all">{currentPath || t('settings.notSet')}</p>
              <p className="text-xs opacity-70 mt-1">{t('downloadBar.clickToChange')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-8 w-px bg-border/50 shrink-0" />

        <Button
          onClick={handleDownloadClick}
          disabled={isDownloading || !currentPath}
          size="lg"
          className="shrink-0 gap-2 rounded-xl px-6 shadow-sm hover:shadow-md transition-all"
          data-testid="download-button"
        >
          {isDownloading ? (
            <>
              <Spinner className="h-4 w-4" />
              {t('download.downloading')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {t('download.button')}
            </>
          )}
        </Button>
      </div>

      {error && (
        <p
          className="text-sm text-destructive px-1"
          role="alert"
          aria-live="assertive"
          data-testid="folder-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
