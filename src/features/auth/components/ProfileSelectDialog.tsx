import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User } from 'lucide-react';
import type { ProfileSummary } from '@/bindings';

function ProfileRow({ profile, onSelect }: { profile: ProfileSummary; onSelect: (key: string) => void }) {
  const { t } = useTranslation();
  const isGoPlus = profile.plan != null && profile.plan !== '' && profile.plan !== 'Free';

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
      onClick={() => onSelect(profile.key)}
    >
      <Avatar className="h-10 w-10 ring-2 ring-border/50">
        {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.username} /> : null}
        <AvatarFallback className="bg-secondary">
          <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{profile.username}</span>
          {isGoPlus && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs font-semibold">
              {t('auth.goPlus')}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {profile.browser} &middot; {profile.profile}
        </span>
      </div>
    </button>
  );
}

function ProfileSelectDialogBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const profiles = useAuthStore((s) => s.profiles);
  const isLoading = useAuthStore((s) => s.isLoadingProfiles);

  const handleSelect = (key: string) => {
    useAuthStore.getState().setSelectedProfileKey(key);
    onClose();
  };

  return (
    <>
      <DialogHeader className="p-6 pb-2">
        <DialogTitle>{t('auth.profilePicker.title')}</DialogTitle>
        <DialogDescription>{t('auth.profilePicker.description')}</DialogDescription>
      </DialogHeader>
      <div className="px-3 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('auth.profilePicker.empty')}</p>
        ) : (
          <div className="space-y-1">
            {profiles.map((profile) => (
              <ProfileRow key={profile.key} profile={profile} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ProfileSelectDialog() {
  const isOpen = useAuthStore((s) => s.isPickerOpen);

  const handleClose = () => {
    useAuthStore.getState().closePicker();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0">{isOpen && <ProfileSelectDialogBody onClose={handleClose} />}</DialogContent>
    </Dialog>
  );
}
