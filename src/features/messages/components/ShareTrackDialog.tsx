import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { getApiErrorMessage } from '@/lib/errorMessages';
import { getArtworkUrl } from '@/lib/soundcloud';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { useConversationsPage } from '../hooks/useConversationsPage';
import { useMessagesStore, type ShareTrackInfo } from '../store';
import { insertOptimisticMessage, invalidateConversation, normalizeContent, rollbackOptimisticMessage } from '../utils/optimisticMessages';
import type { ConversationSummary } from '@/bindings';

function TrackPreview({ track }: { track: ShareTrackInfo }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 overflow-hidden">
      <div className="h-10 w-10 rounded bg-secondary flex-shrink-0 overflow-hidden">
        {track.artworkUrl && <img src={getArtworkUrl(track.artworkUrl) ?? undefined} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>
    </div>
  );
}

function ConversationPickerRow({
  conversation,
  currentUserId,
  isSelected,
  onSelect,
}: {
  conversation: ConversationSummary;
  currentUserId: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { other_user, last_message_content, last_message_sender_id } = conversation;
  const isOwnMessage = last_message_sender_id === currentUserId;
  const preview = isOwnMessage ? `${t('directMessages.you')} : ${last_message_content}` : last_message_content;
  const displayName = other_user.username || t('directMessages.deletedUser');

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full h-full flex items-center gap-3 px-3 text-left transition-colors rounded-md',
        isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'hover:bg-accent/50',
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={other_user.avatar_url ?? undefined} alt={displayName} />
        <AvatarFallback className="text-xs">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>
      </div>
    </button>
  );
}

function ShareTrackDialogBody({ track, onClose }: { track: ShareTrackInfo; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [filter, setFilter] = useState('');

  const { items, currentUserId, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useConversationsPage();
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return items;
    const lower = filter.toLowerCase();
    return items.filter((c) => c.other_user.username.toLowerCase().includes(lower));
  }, [items, filter]);

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: filteredItems.length,
    itemHeight: 56,
  });

  const handleSend = () => {
    if (!selectedUserId) return;
    const otherUserId = selectedUserId;
    const trimmed = messageText.trim();
    const content = normalizeContent(trimmed ? `${trimmed}\n${track.permalinkUrl}` : track.permalinkUrl);

    // Optimistic: insert the message into the conversation, confirm, and close instantly.
    // The send (which may fall back to the WebView) runs in the background; the message
    // is reconciled from the response on success, or rolled back with feedback on failure.
    void insertOptimisticMessage(queryClient, otherUserId, content, currentUserId).then((snapshot) => {
      api
        .sendMessage(otherUserId, content)
        .then(() => {
          invalidateConversation(queryClient, otherUserId);
          toast.success(t('shareTrack.success'));
        })
        .catch((err) => {
          rollbackOptimisticMessage(queryClient, otherUserId, snapshot);
          toast.error(getApiErrorMessage(err, t, 'shareTrack.error'));
          void logger.error(`Failed to share track: ${err}`);
        });
    });

    onClose();
  };

  return (
    <>
      <DialogHeader className="px-4 pt-4 pb-3">
        <DialogTitle>{t('shareTrack.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('shareTrack.description')}</DialogDescription>
      </DialogHeader>

      <div className="px-4 pb-3 overflow-hidden">
        <TrackPreview track={track} />
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('shareTrack.searchPlaceholder')}
            className="pl-8 h-8 text-sm"
            autoComplete="off"
          />
        </div>
      </div>

      <div ref={parentRef} className="h-[320px] overflow-y-auto px-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && filteredItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {filter.trim() ? t('shareTrack.noResults') : t('shareTrack.noConversations')}
          </p>
        )}
        {!isLoading && filteredItems.length > 0 && (
          <div className="relative w-full" style={{ height: totalSize }}>
            {virtualItems.map((virtualRow) => {
              const conv = filteredItems[virtualRow.index];
              if (!conv) return null;
              return (
                <div
                  key={conv.id}
                  className="absolute left-0 w-full overflow-hidden"
                  style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                >
                  <ConversationPickerRow
                    conversation={conv}
                    currentUserId={currentUserId}
                    isSelected={conv.other_user.id === selectedUserId}
                    onSelect={() => setSelectedUserId(conv.other_user.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {selectedUserId && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t px-4 py-3"
        >
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t('shareTrack.messagePlaceholder')}
            className="flex-1"
            autoComplete="off"
            autoFocus
          />
          <Button type="submit" size="icon" aria-label={t('shareTrack.send')}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      )}
    </>
  );
}

export function ShareTrackDialog() {
  const shareTrack = useMessagesStore((s) => s.shareDialogTrack);

  const handleClose = () => {
    useMessagesStore.getState().closeShareDialog();
  };

  return (
    <Dialog
      open={shareTrack !== null}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        {shareTrack && <ShareTrackDialogBody track={shareTrack} onClose={handleClose} />}
      </DialogContent>
    </Dialog>
  );
}
