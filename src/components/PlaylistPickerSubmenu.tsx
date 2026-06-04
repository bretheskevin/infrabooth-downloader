import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check, ListMusic, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuPortal } from '@/components/ui/context-menu';
import { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getArtworkUrl } from '@/lib/soundcloud';
import { api } from '@/lib/tauri';
import { useAddToPlaylist } from '@/hooks/useAddToPlaylist';
import { useLibraryPlaylists } from '@/features/library/hooks/useLibraryPlaylists';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';
import type { PlaylistForTrackPicker } from '@/bindings';

interface PlaylistPickerSubmenuProps {
  trackId: number;
  variant?: 'context' | 'dropdown';
  onSuccess?: () => void;
}

interface PlaylistRowProps {
  playlist: PlaylistForTrackPicker;
  onSelect: (playlist: PlaylistForTrackPicker) => void;
  isAddingThis: boolean;
}

function PlaylistRow({ playlist, onSelect, isAddingThis }: PlaylistRowProps) {
  const { t } = useTranslation();

  const handleClick = useCallback(() => {
    if (!playlist.contains_track && !isAddingThis) {
      onSelect(playlist);
    }
  }, [playlist, isAddingThis, onSelect]);

  const alreadyAdded = playlist.contains_track;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={alreadyAdded || isAddingThis}
      className={cn(
        'flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-sm text-sm outline-none',
        alreadyAdded
          ? 'text-muted-foreground cursor-default opacity-60'
          : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer',
        isAddingThis && 'opacity-50 cursor-wait',
      )}
    >
      <div className="relative w-8 h-8 shrink-0">
        <div className={cn('w-full h-full rounded bg-muted overflow-hidden', alreadyAdded && 'opacity-50')}>
          {playlist.artwork_url ? (
            <img src={getArtworkUrl(playlist.artwork_url, 47)!} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ListMusic className="h-4 w-4" />
            </div>
          )}
        </div>
        {alreadyAdded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
            <Check className="h-4 w-4 text-green-400" />
          </div>
        )}
      </div>
      <span className={cn('flex-1 truncate', alreadyAdded && 'line-through')}>{playlist.title}</span>
      {alreadyAdded && <span className="text-xs text-green-600 dark:text-green-400 shrink-0">{t('trackMenu.added')}</span>}
    </button>
  );
}

interface PlaylistContentProps {
  trackId: number;
  onSuccess?: () => void;
  onOpenChange?: (open: boolean) => void;
}

function PlaylistPickerContent({ trackId, onSuccess, onOpenChange }: PlaylistContentProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const { playlists: libraryPlaylists, isLoading: isLoadingLibrary } = useLibraryPlaylists(true);

  const { data: membershipData, error: membershipError } = useQuery({
    queryKey: ['owned-playlists-for-track', trackId],
    queryFn: () => api.getOwnedPlaylistsForTrack(trackId),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (membershipError) {
      void logger.error(`[PlaylistPickerSubmenu] Failed to fetch membership for track ${trackId}: ${membershipError}`);
    }
  }, [membershipError, trackId]);

  const membershipMap = useMemo(() => {
    if (!membershipData) return new Map<number, PlaylistForTrackPicker>();
    return new Map(membershipData.map((p) => [p.id, p]));
  }, [membershipData]);

  const { addToPlaylist, addingToPlaylistId } = useAddToPlaylist(() => {
    onOpenChange?.(false);
    onSuccess?.();
  });

  const ownedPlaylists = useMemo(() => {
    return libraryPlaylists
      .filter((p) => p.is_owned)
      .map((p) => {
        const membership = membershipMap.get(p.id);
        return {
          id: p.id,
          title: p.title,
          artwork_url: membership?.artwork_url ?? p.artwork_url,
          contains_track: membership?.contains_track ?? false,
        };
      });
  }, [libraryPlaylists, membershipMap]);

  const filteredPlaylists = useMemo(() => {
    let filtered = ownedPlaylists;
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = ownedPlaylists.filter((p) => p.title.toLowerCase().includes(query));
    }
    return filtered;
  }, [ownedPlaylists, search]);

  const handleSelect = useCallback(
    (playlist: PlaylistForTrackPicker) => {
      void addToPlaylist(playlist.id, playlist.title, trackId);
    },
    [addToPlaylist, trackId],
  );

  useEffect(() => {
    setSearch('');
  }, []);

  const isLoading = isLoadingLibrary;

  return (
    <>
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('trackMenu.searchPlaylists')}
            className="pl-8 h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="p-1 border-b">
        <button
          type="button"
          onClick={() => {
            setDialogKey((k) => k + 1);
            setDialogOpen(true);
          }}
          className="flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-sm text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        >
          <div className="w-8 h-8 shrink-0 rounded bg-muted flex items-center justify-center text-muted-foreground">
            <Plus className="h-4 w-4" />
          </div>
          <span>{t('trackMenu.newPlaylist')}</span>
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="flex items-center gap-3 px-2 py-1.5">
              <Skeleton className="w-8 h-8 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))
        ) : filteredPlaylists.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground text-center">
            {search.trim() ? t('trackMenu.noResults', { query: search }) : t('trackMenu.noPlaylists')}
          </p>
        ) : (
          filteredPlaylists.map((playlist) => (
            <PlaylistRow key={playlist.id} playlist={playlist} onSelect={handleSelect} isAddingThis={addingToPlaylistId === playlist.id} />
          ))
        )}
      </div>
      <CreatePlaylistDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trackId={trackId}
        defaultName={search}
        onSuccess={() => {
          onOpenChange?.(false);
          onSuccess?.();
        }}
      />
    </>
  );
}

export function PlaylistPickerSubmenu({ trackId, variant = 'context', onSuccess }: PlaylistPickerSubmenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'dropdown') {
    return (
      <DropdownMenuSub open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuSubTrigger>
          <ListMusic className="h-4 w-4" />
          {t('trackMenu.addToPlaylist')}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-[220px] p-0" collisionPadding={24}>
            <PlaylistPickerContent trackId={trackId} onSuccess={onSuccess} onOpenChange={setIsOpen} />
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <ContextMenuSub open={isOpen} onOpenChange={setIsOpen}>
      <ContextMenuSubTrigger>
        <ListMusic className="mr-2 h-4 w-4" />
        {t('trackMenu.addToPlaylist')}
      </ContextMenuSubTrigger>
      <ContextMenuPortal>
        <ContextMenuSubContent className="w-[220px] p-0" collisionPadding={24}>
          <PlaylistPickerContent trackId={trackId} onSuccess={onSuccess} onOpenChange={setIsOpen} />
        </ContextMenuSubContent>
      </ContextMenuPortal>
    </ContextMenuSub>
  );
}
