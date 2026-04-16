import type { ActorInfo } from '@/bindings';
import { openActorProfile } from '../../utils';

interface ClickableAvatarProps {
  actor: ActorInfo;
  onClose: () => void;
}

export function ClickableAvatar({ actor, onClose }: ClickableAvatarProps) {
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
      className="h-8 w-8 rounded-full bg-muted shrink-0 object-cover cursor-pointer hover:ring-2 hover:ring-primary/50"
    />
  );
}
