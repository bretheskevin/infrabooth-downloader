import { ExternalLink, Folder } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { useTranslation } from 'react-i18next';
import { useFolderSelection } from '@/hooks';
import { useIsDownloadEnabled } from '@/features/settings';
import { getFolderName } from '@/lib/utils';

interface SearchFolderPickerProps {
  path: string;
  onPathChange: (path: string) => void;
}

export function SearchFolderPicker({ path, onPathChange }: SearchFolderPickerProps) {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();
  const handleOpenFolder = useOpenDownloadFolder(path);

  const { selectFolder } = useFolderSelection({
    defaultPath: path,
    dialogTitle: t('search.folderLabel'),
    onSelected: onPathChange,
  });

  if (!isDownloadEnabled) return null;

  const displayPath = getFolderName(path);

  return (
    <div className="flex items-center h-7 rounded-md border border-border/50 bg-secondary/30 overflow-hidden">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={selectFolder}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 h-full hover:bg-secondary/50"
          >
            <Folder className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[150px]">{displayPath}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{path}</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="h-3.5" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleOpenFolder}
            className="flex items-center justify-center h-full px-1.5 text-muted-foreground hover:text-foreground transition-colors hover:bg-secondary/50"
            aria-label={t('completion.openFolder')}
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{t('completion.openFolder')}</TooltipContent>
      </Tooltip>
    </div>
  );
}
