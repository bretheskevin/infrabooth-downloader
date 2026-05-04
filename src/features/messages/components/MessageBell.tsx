import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnreadConversations } from '../hooks/useUnreadConversations';
import { ConversationsList } from './ConversationsList';

export function MessageBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: hasUnread } = useUnreadConversations();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('directMessages.ariaLabel')}
          className="relative text-muted-foreground hover:text-foreground hover:bg-secondary/80"
        >
          <Mail className="h-5 w-5" />
          {hasUnread && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <ConversationsList onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
