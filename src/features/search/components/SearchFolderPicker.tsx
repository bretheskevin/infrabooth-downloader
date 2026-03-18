import { Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFolderSelection } from '@/hooks';
import { useIsDownloadEnabled } from '@/features/settings';

interface SearchFolderPickerProps {
  path: string;
  onPathChange: (path: string) => void;
}

export function SearchFolderPicker({ path, onPathChange }: SearchFolderPickerProps) {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();

  const { selectFolder } = useFolderSelection({
    defaultPath: path,
    dialogTitle: t('search.folderLabel'),
    onSelected: onPathChange,
  });

  if (!isDownloadEnabled) return null;

  // Show abbreviated path (last folder name)
  const displayPath = path.split(/[/\\]/).filter(Boolean).pop() || path;

  return (
    <button
      type="button"
      onClick={selectFolder}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
      title={path}
    >
      <Folder className="h-3 w-3" />
      <span className="truncate max-w-[200px]">{displayPath}</span>
    </button>
  );
}
