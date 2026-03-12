import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { useSettingsStore } from '@/features/settings/store';
import { useDownloadedTracks } from '@/features/library/hooks/useDownloadedTracks';
import { SearchBar } from '@/components/ui/search-bar';
import { SearchFolderPicker } from './SearchFolderPicker';
import { SearchResultList } from './SearchResultList';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useTrackDownload } from '../hooks/useTrackDownload';
import type { DownloadState } from '../types';

export function SearchTab() {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [downloadPath, setDownloadPath] = useState(defaultPath);

  useEffect(() => {
    setDownloadPath(defaultPath);
  }, [defaultPath]);

  const {
    inputValue,
    handleInputChange,
    results,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    hasSearched,
  } = useSearchQuery();

  const { downloadTrack, getTrackState: getRawTrackState } = useTrackDownload(downloadPath);
  const { downloadedIds } = useDownloadedTracks(results, downloadPath, results.length > 0);

  const getTrackState = useCallback(
    (trackId: number): DownloadState => {
      const state = getRawTrackState(trackId);
      if (state.status === 'idle' && downloadedIds.has(trackId)) {
        return { status: 'completed' };
      }
      return state;
    },
    [getRawTrackState, downloadedIds],
  );

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="rounded-full bg-secondary p-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('search.lockedTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('search.lockedDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <SearchBar value={inputValue} onChange={handleInputChange} placeholder={t('search.placeholder')} autoFocus />
      <SearchFolderPicker path={downloadPath} onPathChange={setDownloadPath} />
      <div className="flex-1 min-h-0 overflow-y-auto pr-8">
        <SearchResultList
          results={results}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          error={error}
          hasSearched={hasSearched}
          getTrackState={getTrackState}
          onDownload={downloadTrack}
          onRetry={downloadTrack}
        />
      </div>
    </div>
  );
}
