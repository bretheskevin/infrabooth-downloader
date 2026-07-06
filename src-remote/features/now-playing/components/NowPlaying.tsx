import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { formatDuration } from '@/lib/format';
import { t } from '@remote/lib/i18n';
import { useWaveform } from '@/lib/useWaveform';
import Waveform from './Waveform';

interface Props {
  state: RemoteState | null;
  language: string;
  onCommand: (cmd: RemoteCommand) => void;
}

export default function NowPlaying({ state, language, onCommand }: Props) {
  const waveformUrl = state?.currentTrack?.waveformUrl ?? null;
  const { samples } = useWaveform(waveformUrl);

  if (!state || !state.currentTrack) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">{t('nothingPlaying', language)}</div>;
  }

  const { currentTrack: track, positionMs, durationMs } = state;
  const artworkUrl = track.artworkUrl?.replace('-large', '-t500x500') ?? null;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  function handleSeek(p: number) {
    onCommand({ type: 'seek', positionMs: Math.round(p * durationMs) });
  }

  function handleFallbackTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeek(p);
  }

  return (
    <div className="p-4 flex flex-col items-center gap-4">
      {artworkUrl ? (
        <img src={artworkUrl} alt="" className="w-64 h-64 rounded-lg object-cover" />
      ) : (
        <div className="w-64 h-64 rounded-lg bg-card" />
      )}
      <div className="w-full text-center">
        <p className="font-semibold truncate text-lg">{track.title}</p>
        <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
      </div>
      <div className="w-full flex flex-col gap-1">
        {samples !== null ? (
          <Waveform samples={samples} progress={progress} onSeek={handleSeek} />
        ) : (
          <div className="w-full h-3 rounded-full overflow-hidden cursor-pointer bg-border" onClick={handleFallbackTap}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatDuration(positionMs)}</span>
          <span>{formatDuration(durationMs)}</span>
        </div>
      </div>
    </div>
  );
}
