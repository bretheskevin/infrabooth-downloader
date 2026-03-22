import { Folder } from 'lucide-react';
import { OpenFolderButton } from '@/components/OpenFolderButton';
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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={selectFolder}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
        title={path}
      >
        <Folder className="h-3 w-3" />
        <span className="truncate max-w-[200px]">{displayPath}</span>
      </button>
      <OpenFolderButton onClick={handleOpenFolder} size="sm" />
    </div>
  );
}
