import { useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSettingsStore } from '@/features/settings/store';
import { useRekordboxTree } from '../hooks/useRekordboxTree';
import type { useRekordboxExport } from '../hooks/useRekordboxExport';
import { findInfraboothFolderId, findPlaylistParentId, folderExistsInTree } from '../utils/buildTree';
import { deriveExportMetrics, groupByStatus } from '../utils/exportGroups';
import { ConfirmPhaseContent } from './phases/ConfirmPhaseContent';
import { ExportingContent } from './phases/ExportingContent';
import { CompletePhaseContent } from './phases/CompletePhaseContent';
import { ErrorPhaseContent } from './phases/ErrorPhaseContent';

interface RekordboxExportDialogProps {
  controller: ReturnType<typeof useRekordboxExport>;
  playlistName: string;
  trackCount: number;
}

export function RekordboxExportDialog({ controller, playlistName, trackCount }: RekordboxExportDialogProps) {
  const {
    phase,
    trackStatuses,
    totalTracks,
    result,
    errorCode,
    selectedFolderId,
    setSelectedFolderId,
    startExport,
    cancel,
    close,
    quitAndRetry,
    isQuitting,
  } = controller;

  const { data: treeData, isLoading: treeLoading, isError: treeError, retry: retryTree } = useRekordboxTree(phase === 'confirm');
  const storedDefaultFolderId = useSettingsStore((s) => s.rekordboxDefaultExportFolderId);

  const defaultFolderId = useMemo(() => {
    if (!treeData) return null;
    const playlistParent = findPlaylistParentId(treeData, playlistName);
    if (playlistParent !== null) return playlistParent;
    if (storedDefaultFolderId === 'root') return null;
    if (storedDefaultFolderId && folderExistsInTree(treeData, storedDefaultFolderId)) return storedDefaultFolderId;
    return findInfraboothFolderId(treeData);
  }, [treeData, playlistName, storedDefaultFolderId]);

  const effectiveFolderId = selectedFolderId === undefined ? defaultFolderId : selectedFolderId;

  const groups = groupByStatus(trackStatuses);
  const { isRegistering, completedCount, percent } = deriveExportMetrics(groups, totalTracks);

  return (
    <Dialog
      open={phase !== 'idle'}
      onOpenChange={(open) => {
        if (open) return;
        if (isQuitting) return;
        if (phase === 'exporting') cancel();
        else close();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {phase === 'confirm' && (
          <ConfirmPhaseContent
            playlistName={playlistName}
            trackCount={trackCount}
            treeData={treeData}
            treeLoading={treeLoading}
            treeError={treeError}
            onRetryTree={retryTree}
            effectiveFolderId={effectiveFolderId}
            onSelectFolder={setSelectedFolderId}
            onCancel={close}
            onStart={() => startExport(effectiveFolderId)}
          />
        )}

        {phase === 'exporting' && (
          <ExportingContent
            groups={groups}
            totalTracks={totalTracks}
            completedCount={completedCount}
            percent={percent}
            isRegistering={isRegistering}
            onCancel={cancel}
          />
        )}

        {phase === 'complete' && result && <CompletePhaseContent result={result} groups={groups} onClose={close} />}

        {phase === 'error' && (
          <ErrorPhaseContent errorCode={errorCode} onClose={close} onQuitRekordbox={quitAndRetry} isQuitting={isQuitting} />
        )}
      </DialogContent>
    </Dialog>
  );
}
