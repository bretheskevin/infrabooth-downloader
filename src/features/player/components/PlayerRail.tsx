import { CommentsPanel } from '@/features/comments';
import { usePlayerStore } from '../store';
import { RailNowPlaying } from './RailNowPlaying';
import { RailQueue } from './RailQueue';
import { RailTabToggle } from './RailTabToggle';

export function PlayerRail() {
  const state = usePlayerStore((s) => s.state);
  const railTab = usePlayerStore((s) => s.railTab);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  if (state === 'stopped') return null;

  return (
    <aside className="w-[340px] shrink-0 border-l border-border bg-card/40 flex flex-col h-full overflow-hidden">
      <RailNowPlaying />
      <RailTabToggle />
      {railTab === 'queue' ? (
        <RailQueue />
      ) : (
        <CommentsPanel trackId={currentTrack?.trackId} variant="rail" trackArtistId={currentTrack?.artistId} />
      )}
    </aside>
  );
}
