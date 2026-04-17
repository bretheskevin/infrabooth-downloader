import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePlayerStore } from '@/features/player';
import type { PlaybackItem } from '@/features/player';
import { useMessagesStore } from '../store';
import { MessageTrackCard } from './MessageTrackCard';
import { MessagePlaylistCard } from './MessagePlaylistCard';
import type { ConversationMessage, MessageTrackEmbed, MessageUser } from '@/bindings';
import { formatChatTimestamp } from '@/lib/date';
import { useResolveEmbed } from '../hooks/useResolveEmbed';
import { linkifyText } from '@/lib/linkify';
import { useAuthStore } from '@/features/auth/store';

interface MessageRowProps {
  message: ConversationMessage;
  currentUserId: number;
  otherUser: MessageUser | null;
  showHeader: boolean;
}

function toPlaybackItem(embed: MessageTrackEmbed): PlaybackItem {
  return {
    trackId: embed.id,
    trackUrl: embed.permalink_url,
    title: embed.title,
    artist: embed.artist,
    artistId: embed.artist_id,
    artworkUrl: embed.artwork_url,
    durationMs: embed.duration_ms,
    waveformUrl: embed.waveform_url,
  };
}

function TrackEmbed({ embed }: { embed: MessageTrackEmbed }) {
  return (
    <MessageTrackCard
      embed={embed}
      onPlay={() => void usePlayerStore.getState().play([toPlaybackItem(embed)], 0)}
      onCopyLink={() => void navigator.clipboard.writeText(embed.permalink_url)}
      onOpenInBrowser={() => void open(embed.permalink_url)}
      onAddToQueue={() => usePlayerStore.getState().addToQueue(toPlaybackItem(embed))}
    />
  );
}

export function MessageRow({ message, currentUserId, otherUser, showHeader }: MessageRowProps) {
  const { t, i18n } = useTranslation();
  const isOwnMessage = message.sender_id === currentUserId;

  const myAvatarUrl = useAuthStore((s) => s.avatarUrl);
  const senderName = isOwnMessage ? t('directMessages.you') : (otherUser?.username ?? '');
  const senderAvatar = isOwnMessage ? myAvatarUrl : otherUser?.avatar_url;

  const { trackEmbed, playlistEmbed, rawScUrl } = useResolveEmbed(message.content);
  const displayContent = rawScUrl ? message.content.replace(rawScUrl, '').trim() : message.content;
  const timestamp = formatChatTimestamp(message.sent_at, i18n.language);

  const embedElement = trackEmbed
    ? <TrackEmbed embed={trackEmbed} />
    : playlistEmbed
      ? <MessagePlaylistCard embed={playlistEmbed} onOpen={() => useMessagesStore.getState().openPlaylist(playlistEmbed)} />
      : null;

  if (isOwnMessage) {
    return (
      <div className="flex gap-2.5 items-start justify-end">
        <div className="min-w-0 max-w-[75%]">
          {showHeader && (
            <div className="flex items-center gap-2 justify-end mb-1">
              <span className="text-[10px] text-muted-foreground">{timestamp}</span>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={senderAvatar ?? undefined} alt={senderName} />
                <AvatarFallback className="text-[10px]">{senderName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          )}
          {displayContent && (
            <div className="bg-primary/10 rounded-2xl px-3 py-1.5 ml-auto w-fit">
              <p className="text-sm">{linkifyText(displayContent)}</p>
            </div>
          )}
          {embedElement}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      {showHeader ? (
        <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
          <AvatarImage src={senderAvatar ?? undefined} alt={senderName} />
          <AvatarFallback className="text-[10px]">{senderName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}
      <div className="min-w-0 max-w-[75%]">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold">{senderName}</span>
            <span className="text-[10px] text-muted-foreground">{timestamp}</span>
          </div>
        )}
        {displayContent && (
          <div className="bg-muted/40 rounded-2xl px-3 py-1.5 w-fit">
            <p className="text-sm">{linkifyText(displayContent)}</p>
          </div>
        )}
        {embedElement}
      </div>
    </div>
  );
}
