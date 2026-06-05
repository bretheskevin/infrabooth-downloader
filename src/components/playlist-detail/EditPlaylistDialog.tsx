import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2, Lock, X, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import type { TrackInfo } from '@/bindings';
import { useEditPlaylist } from '@/hooks/useEditPlaylist';

interface EditPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: number;
  initialTitle: string;
  initialIsPublic: boolean;
  isPublicKnown: boolean;
  tracksReady: boolean;
  tracks: TrackInfo[];
  onSaved?: (title: string, isPublic: boolean) => void;
}

export function EditPlaylistDialog({
  open,
  onOpenChange,
  playlistId,
  initialTitle,
  initialIsPublic,
  isPublicKnown,
  tracksReady,
  tracks,
  onSaved,
}: EditPlaylistDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  const resetState = () => {
    setTitle(initialTitle);
    setIsPublic(initialIsPublic);
    setRemovedIds(new Set());
  };

  const { editPlaylist, isEditing } = useEditPlaylist(() => {
    resetState();
    onOpenChange(false);
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isEditing) return;
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleRemove = (trackId: number) => {
    setRemovedIds((prev) => new Set(prev).add(trackId));
  };

  const handleUndo = (trackId: number) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  };

  const remainingTrackIds = useMemo(
    () => tracks.filter((track) => !removedIds.has(track.id)).map((track) => track.id),
    [tracks, removedIds],
  );

  async function handleSave() {
    if (!title.trim() || isEditing || !tracksReady) return;
    const ok = await editPlaylist({
      playlistId,
      title: title.trim(),
      sharing: isPublicKnown ? (isPublic ? 'public' : 'private') : null,
      trackIds: remainingTrackIds,
    });
    if (ok) onSaved?.(title.trim(), isPublic);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle>{t('playlistMenu.editTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('playlistMenu.edit')}</DialogDescription>
        </DialogHeader>

        <div className="px-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-playlist-title" className="text-xs text-muted-foreground">
              {t('playlistMenu.editTitleLabel')}
            </Label>
            <Input id="edit-playlist-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} disabled={isEditing} />
          </div>

          {isPublicKnown && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Label htmlFor="edit-playlist-public-switch" className="text-sm cursor-pointer">
                  {isPublic ? t('trackMenu.public') : t('trackMenu.private')}
                </Label>
              </div>
              <Switch id="edit-playlist-public-switch" checked={isPublic} onCheckedChange={setIsPublic} disabled={isEditing} />
            </div>
          )}
        </div>

        {tracks.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto overflow-x-hidden px-4 mt-3">
            <div className="space-y-0.5 pb-1">
              {tracks.map((track) => {
                const isRemoved = removedIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    className={cn(
                      'flex items-center justify-between py-1.5 px-2 rounded-md text-sm',
                      isRemoved && 'opacity-40 line-through',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{track.title}</span>
                      <span className="text-xs text-muted-foreground truncate block">{track.user.username}</span>
                    </div>
                    {isRemoved ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleUndo(track.id)}
                        disabled={isEditing}
                        aria-label={t('playlistMenu.undoRemove')}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(track.id)}
                        disabled={isEditing}
                        aria-label={t('playlistMenu.removeTrack')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="border-t px-4 py-3 sm:items-center">
          {!tracksReady && <span className="mr-auto text-xs text-muted-foreground">{t('playlistMenu.loadingTracks')}</span>}
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isEditing}>
            {t('playlistMenu.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={!title.trim() || isEditing || !tracksReady}>
            {isEditing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('playlistMenu.saving')}
              </>
            ) : (
              t('playlistMenu.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
