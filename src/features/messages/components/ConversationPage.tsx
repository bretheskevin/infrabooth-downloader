import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Folder, FolderOpen, Link, Loader2, MoreVertical, SendHorizonal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArtistLink } from '@/components/ArtistLink';
import { cn } from '@/lib/utils';
import { useLinkActions } from '@/hooks/useLinkActions';
import { MessageRow } from './MessageRow';
import { useConversationMessages } from '../hooks/useConversationMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useMessagesStore } from '../store';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useIsMiniPillVisible } from '@/features/player/hooks/useIsMiniPillVisible';
import { useTrackDownload } from '@/hooks/useTrackDownload';
import { useFolderPath } from '@/hooks/useFolderPath';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { useIsDownloadEnabled } from '@/features/settings';

export function ConversationPage() {
  const { t } = useTranslation();
  const conversation = useMessagesStore((s) => s.selectedConversation);

  const { items, currentUserId, otherUser, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useConversationMessages(conversation?.otherUserId ?? 0);
  const { sentinelRef } = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });
  const miniPillVisible = useIsMiniPillVisible();
  const { sendMessage, isPending } = useSendMessage(conversation?.otherUserId ?? 0);
  const [inputValue, setInputValue] = useState('');

  const isDownloadEnabled = useIsDownloadEnabled();
  const { effectivePath, folderName, isCustomFolder, selectFolder } = useFolderPath(isDownloadEnabled);
  const handleOpenFolder = useOpenDownloadFolder(effectivePath ?? null);
  const { downloadTrackCore, getTrackState } = useTrackDownload(effectivePath ?? '');
  const trackDownload = { downloadTrackCore, getTrackState };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue('');
  };

  const displayUser = otherUser?.username
    ? otherUser
    : conversation
      ? {
          id: conversation.otherUserId,
          username: conversation.username,
          avatar_url: conversation.avatarUrl,
          permalink_url: conversation.permalinkUrl,
        }
      : null;

  const { handleCopyLink, handleOpenInBrowser } = useLinkActions(displayUser?.permalink_url ?? '');

  const handleClose = () => useMessagesStore.getState().clear();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="icon" onClick={handleClose} aria-label={t('common.back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {displayUser && (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage src={displayUser.avatar_url ?? undefined} alt={displayUser.username} />
              <AvatarFallback className="text-sm">{displayUser.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <ArtistLink userId={displayUser.id} username={displayUser.username} className="text-lg font-semibold" />
            {displayUser.permalink_url && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-auto" aria-label={t('trackMenu.moreActions')}>
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link className="h-3.5 w-3.5" />
                    {t('trackMenu.copyLink')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenInBrowser}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t('trackMenu.openInBrowser')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {isDownloadEnabled && folderName && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground border-b border-border/30 bg-muted/30">
          <Folder className="h-3 w-3 shrink-0" />
          <span>{t('directMessages.savingTo')}</span>
          <span className="truncate max-w-[200px] text-foreground/70 underline">{folderName}</span>
          {isCustomFolder && <span className="text-muted-foreground/60">({t('library.detail.customFolder')})</span>}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectFolder}
              className="h-auto px-1 py-0 text-xs hover:text-foreground transition-colors"
            >
              {t('settings.changeFolder')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenFolder}
              className="h-auto px-1 py-0 text-xs inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
            >
              <FolderOpen className="h-3 w-3" />
              {t('settings.openFolder')}
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-1">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-6 px-4">
          <p className="text-sm text-muted-foreground">{t('directMessages.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('directMessages.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className={cn('flex-1 min-h-0 overflow-y-auto flex flex-col-reverse pb-4 px-4 pt-2', miniPillVisible && 'pb-14')}>
          {items.map((msg, idx) => {
            const prevMsg = items[idx + 1];
            const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;
            return (
              <div key={`${msg.sent_at}-${idx}`} className={showHeader ? 'mt-5' : 'mt-1'}>
                <MessageRow
                  message={msg}
                  currentUserId={currentUserId}
                  otherUser={displayUser}
                  showHeader={showHeader}
                  trackDownload={trackDownload}
                />
              </div>
            );
          })}
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && conversation && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t pt-3 px-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('directMessages.placeholder')}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim() || isPending} aria-label={t('directMessages.send')}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
