import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/features/auth/store';
import { signOut, listProfiles } from '@/features/auth/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, ChevronDown, Users } from 'lucide-react';
import { useArtistProfileStore } from '@/features/artist-profile';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';

export function UserMenu() {
  const { t } = useTranslation();
  const { username, userId, plan, avatarUrl } = useAuthStore(
    useShallow((state) => ({
      username: state.username,
      userId: state.userId,
      plan: state.plan,
      avatarUrl: state.avatarUrl,
    })),
  );
  const isGoPlus = plan != null && plan !== '' && plan !== 'Free';

  const handleOpenProfile = () => {
    if (userId && username) {
      useArtistProfileStore.getState().openProfile(userId, username);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSwitchAccount = async () => {
    try {
      const { setProfiles, openPicker } = useAuthStore.getState();
      openPicker();
      const profiles = await listProfiles();
      setProfiles(profiles);
    } catch (error) {
      void logger.error(`Failed to list profiles: ${getErrorString(error)}`);
      useAuthStore.getState().closePicker();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 rounded-xl h-9 px-3">
          <Avatar className="h-6 w-6 ring-2 ring-border/50">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={username ?? ''} /> : null}
            <AvatarFallback className="bg-secondary">
              <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{username}</span>
          {isGoPlus && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-semibold">
              {t('auth.qualityBadge', 'Go+ 256kbps')}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={handleOpenProfile}>
          <User className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('auth.myProfile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSwitchAccount}>
          <Users className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('auth.switchAccount')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
