import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Globe, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCreatePlaylist } from '@/hooks/useCreatePlaylist';

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: number;
  defaultName: string;
  onSuccess?: () => void;
}

export function CreatePlaylistDialog({ open, onOpenChange, trackId, defaultName, onSuccess }: CreatePlaylistDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [isPublic, setIsPublic] = useState(false);

  const { createPlaylist, isCreating } = useCreatePlaylist(() => {
    onOpenChange(false);
    onSuccess?.();
  });

  async function handleSubmit() {
    if (!name.trim() || isCreating) return;
    await createPlaylist(name.trim(), isPublic ? 'public' : 'private', trackId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle>{t('trackMenu.createPlaylist')}</DialogTitle>
          <DialogDescription className="sr-only">{t('trackMenu.createPlaylistDescription')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="playlist-name" className="text-xs text-muted-foreground">
                {t('trackMenu.playlistName')}
              </Label>
              <Input
                id="playlist-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('trackMenu.playlistName')}
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Label htmlFor="playlist-public-switch" className="text-sm cursor-pointer">
                  {isPublic ? t('trackMenu.public') : t('trackMenu.private')}
                </Label>
              </div>
              <Switch id="playlist-public-switch" checked={isPublic} onCheckedChange={setIsPublic} disabled={isCreating} />
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <Button type="submit" className="w-full" disabled={!name.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('trackMenu.creating')}
                </>
              ) : (
                t('trackMenu.createPlaylist')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
