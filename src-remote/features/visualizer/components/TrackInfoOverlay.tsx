import type { RemoteTrack } from '@/lib/remote-protocol';
import { ScrollingText } from '@/components/ScrollingText';

interface Props {
  track: RemoteTrack;
  artworkUrl: string | null;
}

export default function TrackInfoOverlay({ track, artworkUrl }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {artworkUrl && <img src={artworkUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover shadow-lg" />}
      <div className="min-w-0 flex-1">
        <ScrollingText text={track.title} className="text-lg font-semibold text-white" />
        <p className="truncate text-sm text-white/70">{track.artist}</p>
      </div>
    </div>
  );
}
