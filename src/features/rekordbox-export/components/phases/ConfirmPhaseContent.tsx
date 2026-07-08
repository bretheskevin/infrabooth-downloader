import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { RekordboxTreeNode } from '@/bindings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RekordboxTreePicker } from '../RekordboxTreePicker';

interface ConfirmPhaseContentProps {
  playlistName: string;
  trackCount: number;
  treeData: RekordboxTreeNode[] | undefined;
  treeLoading: boolean;
  treeError: boolean;
  onRetryTree: () => void;
  effectiveFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCancel: () => void;
  onStart: () => void;
}

export function ConfirmPhaseContent({
  playlistName,
  trackCount,
  treeData,
  treeLoading,
  treeError,
  onRetryTree,
  effectiveFolderId,
  onSelectFolder,
  onCancel,
  onStart,
}: ConfirmPhaseContentProps) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
        <DialogDescription>{t('rekordboxExport.confirmMessage', { count: trackCount, playlist: playlistName })}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t('rekordboxExport.destinationLabel')}</Label>
        {treeLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('rekordboxExport.loadingTree')}
          </div>
        ) : treeError ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-destructive">{t('rekordboxExport.treeError')}</p>
            <Button variant="outline" size="sm" onClick={onRetryTree}>
              {t('rekordboxExport.treeRetry')}
            </Button>
          </div>
        ) : (
          <RekordboxTreePicker
            nodes={treeData ?? []}
            selectedFolderId={effectiveFolderId}
            onSelectFolder={onSelectFolder}
            newPlaylistName={playlistName}
          />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t('rekordboxExport.cancel')}
        </Button>
        <Button onClick={onStart} disabled={treeLoading || treeError}>
          {t('rekordboxExport.start')}
        </Button>
      </DialogFooter>
    </>
  );
}
