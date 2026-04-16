import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { NotificationsDropdown } from './NotificationsDropdown';

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useUnreadNotifications();
  const unread = data?.unread ?? false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('notifications.ariaLabel')}
          className="relative text-muted-foreground hover:text-foreground hover:bg-secondary/80"
        >
          <Bell className="h-5 w-5" />
          {unread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationsDropdown onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
