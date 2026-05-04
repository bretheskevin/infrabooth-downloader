import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/features/settings/store';
import { useRekordboxTree } from '@/features/rekordbox-export/hooks/useRekordboxTree';
import { RekordboxTreePicker } from '@/features/rekordbox-export/components/RekordboxTreePicker';
import { folderExistsInTree } from '@/features/rekordbox-export/utils/buildTree';

const ROOT_SENTINEL = 'root';

export function DefaultExportFolderSection() {
  const { t } = useTranslation();
  const storedFolderId = useSettingsStore((s) => s.rekordboxDefaultExportFolderId);
  const [showTreePicker, setShowTreePicker] = useState(false);
  const needsTree = showTreePicker || (storedFolderId !== null && storedFolderId !== ROOT_SENTINEL);
  const { data: treeData, isLoading: treeLoading } = useRekordboxTree(needsTree);

  const isStoredFolderValid = useMemo(() => {
    if (!treeData || !storedFolderId || storedFolderId === ROOT_SENTINEL) return true;
    return folderExistsInTree(treeData, storedFolderId);
  }, [treeData, storedFolderId]);

  const resolvedFolderName = useMemo(() => {
    if (!storedFolderId) return null;
    if (storedFolderId === ROOT_SENTINEL) return t('rekordboxExport.rootFolder');
    if (!treeData) return null;
    const node = treeData.find((n) => n.id === storedFolderId);
    return node?.name ?? null;
  }, [treeData, storedFolderId, t]);

  const treePickerFolderId = storedFolderId === ROOT_SENTINEL ? null : storedFolderId;

  function handleSelectFolder(folderId: string | null) {
    useSettingsStore.getState().setRekordboxDefaultExportFolderId(folderId === null ? ROOT_SENTINEL : folderId);
  }

  function handleResetDefaultFolder() {
    useSettingsStore.getState().setRekordboxDefaultExportFolderId(null);
    setShowTreePicker(false);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-base font-medium">{t('settings.rekordboxDefaultExportLabel')}</Label>
        <p className="text-sm text-muted-foreground">{t('settings.rekordboxDefaultExportDescription')}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono">{resolvedFolderName ?? t('settings.rekordboxDefaultExportDefault')}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setShowTreePicker(!showTreePicker)}>
            {t('settings.rekordboxDefaultExportChange')}
          </Button>
          {storedFolderId && (
            <Button variant="ghost" size="sm" onClick={handleResetDefaultFolder}>
              {t('settings.rekordboxDefaultExportReset')}
            </Button>
          )}
        </div>
      </div>
      {!isStoredFolderValid && storedFolderId && treeData && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{t('settings.rekordboxDefaultExportDeleted')}</p>
      )}
      {showTreePicker &&
        (treeLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('settings.rekordboxDefaultExportLoadingTree')}
          </div>
        ) : treeData ? (
          <RekordboxTreePicker nodes={treeData} selectedFolderId={treePickerFolderId} onSelectFolder={handleSelectFolder} />
        ) : null)}
    </div>
  );
}
