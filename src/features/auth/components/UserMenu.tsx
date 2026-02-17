import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { signOut } from '@/features/auth/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { t } = useTranslation();
  const username = useAuthStore((state) => state.username);
  const plan = useAuthStore((state) => state.plan);
  const avatarUrl = useAuthStore((state) => state.avatarUrl);
  const isGoPlus = plan != null && plan !== '' && plan !== 'Free';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={username ?? ''} /> : null}
            <AvatarFallback className="bg-muted">
              <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{username}</span>
          {isGoPlus && (
            <Badge
              variant="secondary"
              className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
            >
              {t('auth.qualityBadge', 'Go+ 256kbps')}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
