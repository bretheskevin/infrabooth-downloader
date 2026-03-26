import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight, Folder } from 'lucide-react';
import { OpenFolderButton } from '@/components/OpenFolderButton';

interface FolderMetadataProps {
  folderName: string | undefined;
  isCustomFolder: boolean;
  downloadedCount: number;
  isDownloadEnabled: boolean;
  onChangeFolder: () => void;
  onOpenFolder: () => void;
}

export function FolderMetadata({
  folderName,
  isCustomFolder,
  downloadedCount,
  isDownloadEnabled,
  onChangeFolder,
  onOpenFolder,
}: FolderMetadataProps) {
  const { t } = useTranslation();

  return (
    <>
      {isDownloadEnabled && folderName && (
        <>
          <span className="text-border">&middot;</span>
          <button
            type="button"
            onClick={onChangeFolder}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border border-border/50 bg-muted/30 hover:bg-muted transition-colors shrink-0 max-w-[200px]"
            aria-label={t('library.detail.changeFolder')}
          >
            <Folder className="h-3 w-3 shrink-0" />
            <span className="truncate">{folderName}</span>
            {isCustomFolder && (
              <span className="text-[10px] text-muted-foreground/70 shrink-0">
                ({t('library.detail.customFolder')})
              </span>
            )}
            <ChevronRight className="h-3 w-3 shrink-0" />
          </button>
          <OpenFolderButton onClick={onOpenFolder} size="sm" />
        </>
      )}
      {isDownloadEnabled && downloadedCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 shrink-0"
          aria-label={t('library.detail.downloadedCount', { count: downloadedCount })}
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
          {t('library.detail.downloadedCount', { count: downloadedCount })}
        </span>
      )}
    </>
  );
}
