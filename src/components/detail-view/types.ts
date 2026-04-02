import type { TrackInfo } from '@/bindings';
import type { FilterChipsProps } from '@/components/FilterChips';

export type FilterConfig<T extends string = string> = FilterChipsProps<T>;

export interface SortConfig<T extends string = string> {
  options: readonly { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  direction: 'asc' | 'desc';
  onDirectionChange: (dir: 'asc' | 'desc') => void;
  variant?: 'chips' | 'select';
}

export interface TrackListConfig {
  virtualized?: boolean;
  itemHeight?: number;
  searchThreshold?: number;
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

export interface FolderState {
  effectivePath: string | undefined;
  folderName: string | undefined;
  isCustomFolder: boolean;
  handleChangeFolder: () => Promise<string | null>;
  handleOpenFolder: () => Promise<void>;
}

export interface DetailViewRenderContext {
  trackCount: number;
  downloadedCount: number;
  downloadAllAction: React.ReactNode;
  isDownloadEnabled: boolean;
  folder: FolderState;
}

export interface DetailViewMessages {
  empty: string;
  noResults?: string;
  error?: string;
}

export interface DetailViewLayoutProps<
  S extends string = string,
  F extends string = string,
> {
  tracks: TrackInfo[] | undefined;
  isLoading: boolean;
  isStreaming?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  title: string;
  header: React.ReactNode | ((ctx: DetailViewRenderContext) => React.ReactNode);
  download: DownloadConfig;
  folder?: boolean;
  trackList?: TrackListConfig;
  filters?: FilterConfig<F>;
  sort?: SortConfig<S>;
  messages: DetailViewMessages;
  resetKey?: string | number;
}
