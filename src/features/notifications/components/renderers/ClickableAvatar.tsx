import type { ActorInfo } from '@/bindings';
import { openActorProfile } from '../../utils';

interface ClickableAvatarProps {
  actor: ActorInfo;
  onClose: () => void;
  size?: number;
}

export function ClickableAvatar({ actor, onClose, size = 32 }: ClickableAvatarProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openActorProfile(actor, onClose);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      openActorProfile(actor, onClose);
    }
  };

  return (
    <img
      src={actor.avatar_url ?? undefined}
      alt=""
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ width: size, height: size }}
      className="rounded-full bg-muted shrink-0 object-cover cursor-pointer hover:ring-2 hover:ring-primary/50"
    />
  );
}
