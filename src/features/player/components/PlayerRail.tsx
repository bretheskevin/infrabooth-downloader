import { usePlayerStore } from '../store';
import { RailNowPlaying } from './RailNowPlaying';
import { RailQueue } from './RailQueue';

export function PlayerRail() {
  const state = usePlayerStore((s) => s.state);
  if (state === 'stopped') return null;

  return (
    <aside className="w-[340px] shrink-0 border-l border-border bg-card/40 flex flex-col h-full overflow-hidden">
      <RailNowPlaying />
      <RailQueue />
    </aside>
  );
}
