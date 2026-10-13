import { useEffect } from 'react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { getArtworkUrl } from '@/lib/soundcloud';
import { useVisualizerSettings } from '../hooks/useVisualizerSettings';
import { useAutoHide } from '../hooks/useAutoHide';
import { useWakeLock } from '../hooks/useWakeLock';
import { useExitFullscreenOnUnmount } from '../hooks/useFullscreen';
import { useArtworkColor } from '../hooks/useArtworkColor';
import { usePointerGesture } from '../hooks/usePointerGesture';
import { cycleStyle } from '../utils/visualizerSettings';
import type { Gesture } from '../utils/gesture';
import VisualizerCanvas from './VisualizerCanvas';
import VisualizerControls from './VisualizerControls';
import TrackInfoOverlay from './TrackInfoOverlay';
import RadialArtwork from './RadialArtwork';

interface Props {
  state: RemoteState | null;
  language: string;
  send: (cmd: RemoteCommand) => void;
  setSpectrumEnabled: (enabled: boolean) => void;
  onExit: () => void;
}

export default function VisualizerScreen({ state, language, send, setSpectrumEnabled, onExit }: Props) {
  const [settings, updateSettings] = useVisualizerSettings(state, send);
  const controls = useAutoHide();
  const track = state?.currentTrack ?? null;
  const sourceArtworkUrl = track?.artworkUrl ?? null;
  const artworkUrl = getArtworkUrl(sourceArtworkUrl, 500);
  const artworkHsl = useArtworkColor(settings.artworkColor ? getArtworkUrl(sourceArtworkUrl, 200) : null);
  useWakeLock();
  useExitFullscreenOnUnmount();

  useEffect(() => {
    setSpectrumEnabled(true);
    return () => setSpectrumEnabled(false);
  }, [setSpectrumEnabled]);

  function handleGesture(gesture: Gesture) {
    if (gesture === 'tap') controls.toggle();
    else updateSettings({ ...settings, style: cycleStyle(settings.style, gesture === 'next' ? 1 : -1) });
  }

  const pointerHandlers = usePointerGesture(handleGesture);

  return (
    <div className="fixed inset-0 z-50 touch-none select-none overflow-hidden bg-black text-white" {...pointerHandlers}>
      {settings.blurredBackground && artworkUrl && (
        <img
          src={artworkUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-3xl"
        />
      )}
      <VisualizerCanvas style={settings.style} colorHsl={artworkHsl} playing={state?.state === 'playing'} />
      {settings.style === 'radial' && artworkUrl && <RadialArtwork src={artworkUrl} />}
      {settings.showTrackInfo && track && <TrackInfoOverlay track={track} artworkUrl={artworkUrl} />}
      {controls.visible && (
        <VisualizerControls
          settings={settings}
          language={language}
          onChange={updateSettings}
          onExit={onExit}
          onInteract={controls.reveal}
        />
      )}
    </div>
  );
}
