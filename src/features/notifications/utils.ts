import { useArtistProfileStore } from '@/features/artist-profile';
import type { ActorInfo } from '@/bindings';

export function openActorProfile(actor: ActorInfo, onClose: () => void) {
  useArtistProfileStore.getState().openProfile(actor.id, actor.username);
  onClose();
}
