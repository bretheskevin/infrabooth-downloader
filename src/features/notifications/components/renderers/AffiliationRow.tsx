import { useTranslation } from 'react-i18next';
import type { NotificationItem } from '@/bindings';
import { formatRelativeTime } from '@/lib/date';
import { openActorProfile } from '../../utils';
import { NOTIFICATION_ROW_CLASS } from './styles';

type AffiliationItem = Extract<NotificationItem, { kind: 'affiliation' }>;

interface AffiliationRowProps {
  item: AffiliationItem;
  onClose: () => void;
}

export function AffiliationRow({ item, onClose }: AffiliationRowProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => openActorProfile(item.actor, onClose)}
      className={NOTIFICATION_ROW_CLASS}
    >
      <img
        src={item.actor.avatar_url ?? undefined}
        alt=""
        className="h-8 w-8 rounded-full bg-muted shrink-0 object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {t('notifications.label.affiliation', { actor: item.actor.username })}
        </p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at, t)}</p>
      </div>
    </button>
  );
}
