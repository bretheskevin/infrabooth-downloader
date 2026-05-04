import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/features/auth/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TrackInfo } from '@/bindings';
import { libraryActions, useLibraryStore } from '../store';
import { LibraryLockedState } from './LibraryLockedState';
import { PlaylistsTabContent } from './PlaylistsTabContent';
import { TracksTabContent } from './TracksTabContent';

interface LibraryTabProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function LibraryTab({ onDownloadTracks }: LibraryTabProps) {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const { activeTab } = useLibraryStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
    })),
  );

  if (!isSignedIn) {
    return <LibraryLockedState />;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => libraryActions().setActiveTab(v as 'playlists' | 'tracks')}
      className="flex flex-col flex-1 min-h-0"
    >
      <TabsList variant="underline" className="w-fit">
        <TabsTrigger value="playlists">{t('library.tabs.playlists')}</TabsTrigger>
        <TabsTrigger value="tracks">{t('library.tabs.tracks')}</TabsTrigger>
      </TabsList>
      <TabsContent value="playlists" className="flex-1 min-h-0 flex flex-col mt-4 data-[state=inactive]:hidden">
        <PlaylistsTabContent onDownloadTracks={onDownloadTracks} />
      </TabsContent>
      <TabsContent value="tracks" className="flex-1 min-h-0 flex flex-col mt-4 data-[state=inactive]:hidden">
        <TracksTabContent onDownloadTracks={onDownloadTracks} />
      </TabsContent>
    </Tabs>
  );
}
