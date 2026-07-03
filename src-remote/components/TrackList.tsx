import type { RemoteCommand, RemoteState, RemoteTrack } from '@/lib/remote-protocol';
import { t } from '@remote/lib/i18n';
import TrackRow from '@remote/components/TrackRow';
import { useToast } from '@remote/hooks/useToast';

interface Props {
  tracks: RemoteTrack[];
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  language: string;
  onPlay: (track: RemoteTrack, index: number) => void;
}

export default function TrackList({ tracks, state, send, language, onPlay }: Props) {
  const { showToast, toastElement } = useToast();

  return (
    <>
      <ul>
        {tracks.map((track, index) => (
          <TrackRow
            key={track.trackId}
            track={track}
            state={state}
            onPlay={() => onPlay(track, index)}
            onQueue={() => {
              send({ type: 'queueTrack', track });
              showToast(t('addedToQueue', language));
            }}
            onDownload={() => {
              send({ type: 'downloadTrack', track });
              showToast(t('downloading', language));
            }}
          />
        ))}
      </ul>
      {toastElement}
    </>
  );
}
