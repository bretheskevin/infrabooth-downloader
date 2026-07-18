import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePlayerStore } from '@/features/player';
import { toPlaybackItem } from '../utils/conversationQueue';
import { useMessagesStore } from '../store';
import { MessageTrackCard } from './MessageTrackCard';
import { MessagePlaylistCard } from './MessagePlaylistCard';
import { MessageUserCard } from './MessageUserCard';
import type { ConversationMessage, MessageEmbed, MessageTrackEmbed, MessageUser, TrackCore } from '@/bindings';
import { formatChatTimestamp } from '@/lib/date';
import { useResolveEmbed } from '../hooks/useResolveEmbed';
import { linkifyText } from '@/lib/linkify';
import { useAuthStore } from '@/features/auth/store';
import { useArtistProfileStore } from '@/features/artist-profile';
import { buildTrackApiUrl } from '@/lib/soundcloud';
import type { DownloadState } from '@/types/download';

interface TrackDownloadControls {
  downloadTrackCore: (core: TrackCore) => Promise<void>;
  getTrackState: (trackId: number) => DownloadState;
}

interface MessageRowProps {
  message: ConversationMessage;
  currentUserId: number;
  otherUser: MessageUser | null;
  showHeader: boolean;
  trackDownload: TrackDownloadControls;
  onPlayTrack: () => void;
}

function embedToTrackCore(embed: MessageTrackEmbed): TrackCore {
  return {
    trackUrl: buildTrackApiUrl(embed.id),
    trackId: String(embed.id),
    title: embed.title,
    artist: embed.artist,
    artworkUrl: embed.artwork_url,
    durationMs: embed.duration_ms,
    downloadUrl: null,
    secretToken: null,
  };
}

function renderTrackEmbed(embed: MessageTrackEmbed, trackDownload: TrackDownloadControls, onPlayTrack: () => void) {
  const handleDownload = () => void trackDownload.downloadTrackCore(embedToTrackCore(embed));
  return (
    <MessageTrackCard
      embed={embed}
      onPlay={onPlayTrack}
      onAddToQueue={() => usePlayerStore.getState().addToQueue(toPlaybackItem(embed))}
      downloadState={trackDownload.getTrackState(embed.id)}
      onDownload={handleDownload}
      onRetry={handleDownload}
    />
  );
}

function renderEmbed(embed: MessageEmbed, trackDownload: TrackDownloadControls, onPlayTrack: () => void) {
  switch (embed.kind) {
    case 'Track':
      return renderTrackEmbed(embed, trackDownload, onPlayTrack);
    case 'Playlist':
      return <MessagePlaylistCard embed={embed} onOpen={() => useMessagesStore.getState().openPlaylist(embed)} />;
    case 'User':
      return <MessageUserCard embed={embed} onOpen={() => useArtistProfileStore.getState().openProfile(embed.id, embed.username)} />;
  }
}

export function MessageRow({ message, currentUserId, otherUser, showHeader, trackDownload, onPlayTrack }: MessageRowProps) {
  const { t, i18n } = useTranslation();
  const isOwnMessage = message.sender_id === currentUserId;

  const myAvatarUrl = useAuthStore((s) => s.avatarUrl);
  const senderName = isOwnMessage ? t('directMessages.you') : (otherUser?.username ?? '');
  const senderAvatar = isOwnMessage ? myAvatarUrl : otherUser?.avatar_url;

  const { embed, rawScUrl } = useResolveEmbed(message.content);
  const displayContent = rawScUrl ? message.content.replace(rawScUrl, '').trim() : message.content;
  const timestamp = formatChatTimestamp(message.sent_at, i18n.language);

  const embedElement = embed ? renderEmbed(embed, trackDownload, onPlayTrack) : null;

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
