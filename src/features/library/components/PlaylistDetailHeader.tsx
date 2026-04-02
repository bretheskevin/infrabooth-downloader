import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';
import { FolderMetadata } from '@/components/FolderMetadata';
import { DetailHeader } from '@/components/DetailHeader';
import { PreserveOrderToggle } from '@/components/PreserveOrderToggle';
import type { LibraryPlaylist } from '@/bindings';
import { formatTotalDuration } from '@/lib/format';
import { useIsDownloadEnabled } from '@/features/settings';

interface PlaylistDetailHeaderProps {
  playlist: LibraryPlaylist;
  artworkUrl: string | null;
  trackCount: number;
  onBack: () => void;
  downloadedCount: number;
  folderName: string | undefined;
  isCustomFolder: boolean;
  onChangeFolder: () => void;
  onOpenFolder: () => void;
  showOrderToggle?: boolean;
  actions?: React.ReactNode;
}

export function PlaylistDetailHeader({
  playlist,
  artworkUrl,
  trackCount,
  onBack,
  downloadedCount,
  folderName,
  isCustomFolder,
  onChangeFolder,
  onOpenFolder,
  showOrderToggle,
  actions,
}: PlaylistDetailHeaderProps) {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();

  return (
    <DetailHeader
      onBack={onBack}
      title={playlist.title}
      artwork={
        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Music className="w-5 h-5" />
            </div>
          )}
        </div>
      }
      subtitle={
        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
          <span className="truncate">
            {playlist.username}
            {' · '}
            {t('library.detail.tracks', { count: trackCount })}
            {' · '}
            {formatTotalDuration(playlist.duration)}
          </span>
          <FolderMetadata
            folderName={folderName}
            isCustomFolder={isCustomFolder}
            downloadedCount={downloadedCount}
            isDownloadEnabled={isDownloadEnabled}
            onChangeFolder={onChangeFolder}
            onOpenFolder={onOpenFolder}
          />
        </p>
      }
      actions={actions}
    >
      {isDownloadEnabled && showOrderToggle && (
        <div className="flex justify-end">
          <PreserveOrderToggle compact />
        </div>
      )}
    </DetailHeader>
  );
}
