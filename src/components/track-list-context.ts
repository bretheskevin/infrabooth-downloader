import { createContext, useContext } from 'react';
import type { TrackInfo } from '@/bindings';

export interface TrackListContextValue {
  playTrack: (index: number) => void;
  downloadTrack: (track: TrackInfo) => void;
  isDownloadEnabled: boolean;
  downloadVariant?: 'ghost' | 'filled';
  downloadedIds: Set<number>;
  selection?: {
    selectedIds: Set<number>;
    toggleTrack: (id: number) => void;
    nonSelectableIds?: Set<number>;
  };
  animate?: boolean;
  playlistId?: string;
}

export const TrackListContext = createContext<TrackListContextValue | null>(null);

export function useTrackListContext(): TrackListContextValue {
  const ctx = useContext(TrackListContext);
  if (!ctx) throw new Error('InteractiveTrackRow must be wrapped in TrackListProvider');
  return ctx;
}

export function useTrackListContextOptional(): TrackListContextValue | null {
  return useContext(TrackListContext);
}
