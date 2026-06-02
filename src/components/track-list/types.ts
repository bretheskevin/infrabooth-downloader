import type { TrackInfo } from '@/bindings';
import type { FilterChipsProps } from '@/components/FilterChips';
import type { ShareTrackInfo } from '@/features/messages/store';
import type { LikeState } from '@/hooks/useLikeTrack';

export type FilterConfig<T extends string = string> = FilterChipsProps<T>;

export interface SortConfig<T extends string = string> {
  options: readonly { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  direction: 'asc' | 'desc';
  onDirectionChange: (dir: 'asc' | 'desc') => void;
}

export interface TrackListConfig {
  virtualized?: boolean;
  itemHeight?: number;
  searchPlaceholder?: string;
  subtitleSlot?: (track: TrackInfo, index: number) => React.ReactNode;
  onRemoveFromPlaylist?: (track: TrackInfo) => void;
  initialScrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
}

export interface DownloadConfig {
  path?: string | undefined;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export interface TrackListRenderContext {
  actions: React.ReactNode;
  folderMetadata: React.ReactNode;
  onPlayAll?: () => void;
  onShuffle?: () => void;
}

export interface TrackListMessages {
  empty: string;
  noResults?: string;
  error?: string;
}

export interface TracksQuery {
  tracks: TrackInfo[] | undefined;
  isLoading: boolean;
  isStreaming?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export interface TrackListSource {
  title: string;
  id?: string;
  permalinkUrl?: string;
  shareInfo?: ShareTrackInfo;
  likeState?: LikeState;
}

export interface TrackListViewProps<F extends string = string> {
  query: TracksQuery;
  source: TrackListSource;
  header: React.ReactNode | ((ctx: TrackListRenderContext) => React.ReactNode);
  download: DownloadConfig;
  folder?: boolean;
  trackList?: TrackListConfig;
  filters?: FilterConfig<F>;
  messages: TrackListMessages;
  resetKey?: string | number;
}
