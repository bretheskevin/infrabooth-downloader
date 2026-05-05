import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import type { NotificationItem } from '@/bindings';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/date';
import { useFollowArtist } from '@/features/artist-profile/hooks/useFollowArtist';
import { openActorProfile } from '../../utils';
import { NOTIFICATION_ROW_CLASS, NOTIFICATION_ROW_WIDESCREEN_CLASS, handleKeyActivate } from './styles';

type AffiliationItem = Extract<NotificationItem, { kind: 'affiliation' }>;

interface AffiliationRowProps {
  item: AffiliationItem;
  onClose: () => void;
  variant?: 'compact' | 'widescreen';
}

export function AffiliationRow({ item, onClose, variant }: AffiliationRowProps) {
  const { t } = useTranslation();
  const rowClass = variant === 'widescreen' ? NOTIFICATION_ROW_WIDESCREEN_CLASS : NOTIFICATION_ROW_CLASS;
  const avatarSize = variant === 'widescreen' ? 42 : 32;
  const { isFollowing, isLoading, toggle } = useFollowArtist(item.actor.id);

  const handleClick = () => openActorProfile(item.actor, onClose);

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle();
  };

  return (
    <div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyActivate(handleClick)} className={rowClass}>
      <img
        src={item.actor.avatar_url ?? undefined}
        alt=""
        style={{ width: avatarSize, height: avatarSize }}
        className="rounded-full bg-muted shrink-0 object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{t('notifications.label.affiliation', { actor: item.actor.username })}</p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at, t)}</p>
      </div>
      {variant === 'widescreen' && (
        <Button
          variant={isFollowing ? 'default' : 'secondary'}
          size="pill"
          disabled={isLoading}
          onClick={handleFollowClick}
          className="shrink-0 shadow-none"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isFollowing ? (
            <UserCheck className="h-3.5 w-3.5" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {isFollowing ? t('notifications.following') : t('notifications.follow')}
        </Button>
      )}
    </div>
  );
}
